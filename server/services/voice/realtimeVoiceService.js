import WebSocket from 'ws';
import { runWithTenant } from '../../utils/tenantContext.js';
import { Contact } from '../../models/Contact.js';
import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';
import { DocumentChunk } from '../../models/DocumentChunk.js';
import { getEmbedding, cosineSimilarity } from '../knowledgeBase/vectorSearch.js';
import { runWorkflows } from '../workflow/workflowEngine.js';

// Scoped RAG Search helper for active companyId context
const searchKB = async (companyId, query) => {
  try {
    const userVector = await getEmbedding(query);
    // Find all chunks. Scoped automatically by companyId via tenantPlugin
    const chunks = await DocumentChunk.find().populate('documentId');
    
    const scored = chunks
      .map(c => ({
        chunk: c,
        similarity: cosineSimilarity(userVector, c.embedding)
      }))
      .filter(c => c.similarity >= 0.7 && c.chunk.documentId?.status === 'indexed')
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3); // Top 3 relevant voice snippets
      
    const context = scored.map(c => c.chunk.content).join('\n\n');
    return context || 'No matching information found in knowledge base.';
  } catch (err) {
    process.stderr.write(`Voice Agent KB Search Error: ${err.message}\n`);
    return 'Search failed due to internal error.';
  }
};

/**
 * Handles Twilio Media Stream connection, opens a link to OpenAI Realtime API,
 * relays u-law audio both ways, registers function calling, and buffers transcripts.
 */
export const handleVoiceCall = (twilioWs, companyId, callSid, fromPhoneNumber) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    process.stderr.write('Voice Agent Error: OPENAI_API_KEY is not defined in environments.\n');
    twilioWs.close();
    return;
  }

  // 1. Establish secure client WebSocket to OpenAI Realtime API
  const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  let streamSid = '';
  const transcriptBuffer = [];
  let isSaved = false;

  // 2. Local save helper to capture transcript logs safely on call termination
  const saveCallLogs = async () => {
    if (isSaved) return;
    isSaved = true;

    if (transcriptBuffer.length === 0) {
      process.stdout.write(`Call ${callSid} terminated. No transcript logged.\n`);
      return;
    }

    try {
      await runWithTenant(companyId, async () => {
        // Find or create Contact by Phone
        const cleanPhone = fromPhoneNumber ? fromPhoneNumber.trim() : 'Unknown';
        let contact = await Contact.findOne({ phone: cleanPhone, isDeleted: false });
        if (!contact) {
          contact = await Contact.create({
            name: fromPhoneNumber ? `Voice Caller ${fromPhoneNumber.slice(-4)}` : 'Voice Caller',
            phone: cleanPhone,
            source: 'phone',
            leadStatus: 'new'
          });
        }

        // Establish Conversation
        const conversation = await Conversation.create({
          visitorId: `phone-${callSid}`,
          channel: 'phone',
          status: 'closed', // Calls are stored as closed sessions when hung up
          contactId: contact._id
        });

        // Write dialogue messages
        for (const item of transcriptBuffer) {
          await Message.create({
            conversationId: conversation._id,
            role: item.role,
            content: item.content
          });
        }

        process.stdout.write(`Call ${callSid} logs saved successfully. Count: ${transcriptBuffer.length} messages.\n`);

        // Trigger workflow rules immediately when the phone call ends
        try {
          await runWorkflows(conversation._id);
        } catch (workflowErr) {
          process.stderr.write(`Failed to run workflows for call conversation ${conversation._id}: ${workflowErr.message}\n`);
        }
      });
    } catch (err) {
      process.stderr.write(`Failed to save call logs for CallSid ${callSid}: ${err.message}\n`);
    }
  };

  // 3. OpenAI WebSocket lifecycle listeners
  openAiWs.on('open', () => {
    process.stdout.write(`Connected to OpenAI Realtime API for CallSid: ${callSid}\n`);
    
    // Configure voice session parameters
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a professional, polite, and extremely concise phone support agent for this company. Speak naturally, keep answers under 2 sentences, and avoid listing long lists or tables. Use the search_knowledge_base function to search documents for accurate company information before answering facts.',
        voice: 'alloy',
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600
        },
        tools: [
          {
            type: 'function',
            name: 'search_knowledge_base',
            description: 'Queries the company knowledge base database to lookup factual details about products or pricing.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search keywords query.'
                }
              },
              required: ['query']
            }
          }
        ]
      }
    };
    openAiWs.send(JSON.stringify(sessionConfig));
  });

  openAiWs.on('message', async (data) => {
    try {
      const event = JSON.parse(data.toString());

      switch (event.type) {
        case 'response.audio.delta':
          // Relay AI audio stream delta back to Twilio
          if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
            twilioWs.send(JSON.stringify({
              event: 'media',
              streamSid: streamSid,
              media: {
                payload: event.delta
              }
            }));
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // Buffer user STT transcription
          if (event.transcript && event.transcript.trim()) {
            transcriptBuffer.push({
              role: 'user',
              content: event.transcript.trim()
            });
          }
          break;

        case 'response.audio_transcript.done':
          // Buffer assistant TTS output transcript
          if (event.transcript && event.transcript.trim()) {
            transcriptBuffer.push({
              role: 'assistant',
              content: event.transcript.trim()
            });
          }
          break;

        case 'response.function_call_arguments.done':
          // OpenAI triggers RAG lookup
          if (event.name === 'search_knowledge_base') {
            const { call_id: callId, arguments: argsString } = event;
            const args = JSON.parse(argsString);
            
            // Run search inside tenant context
            const resultText = await runWithTenant(companyId, () => 
              searchKB(companyId, args.query)
            );

            // Feed results back to OpenAI session
            openAiWs.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: callId,
                output: resultText
              }
            }));

            // Force OpenAI to continue answering
            openAiWs.send(JSON.stringify({
              type: 'response.create'
            }));
          }
          break;

        case 'error':
          process.stderr.write(`OpenAI Realtime API Warning: ${JSON.stringify(event.error)}\n`);
          break;

        default:
          break;
      }
    } catch (err) {
      process.stderr.write(`Realtime Audio Event Parse Error: ${err.message}\n`);
    }
  });

  openAiWs.on('close', () => {
    process.stdout.write(`OpenAI connection closed for CallSid ${callSid}\n`);
    saveCallLogs();
  });

  openAiWs.on('error', (err) => {
    process.stderr.write(`OpenAI Realtime socket error: ${err.message}\n`);
    saveCallLogs();
  });

  // 4. Exposed handlers for incoming Twilio Media Stream events
  return {
    handleTwilioStart: (sid) => {
      streamSid = sid;
    },
    handleTwilioAudio: (base64Payload) => {
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Payload
        }));
      }
    },
    handleTwilioStop: () => {
      process.stdout.write(`Twilio Media Stream stop event for CallSid ${callSid}\n`);
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
      saveCallLogs();
    },
    handleTwilioClose: () => {
      process.stdout.write(`Twilio WebSocket socket closed for CallSid ${callSid}\n`);
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.close();
      }
      saveCallLogs();
    }
  };
};
export default handleVoiceCall;
