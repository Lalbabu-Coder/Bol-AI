import { Message } from '../../models/Message.js';
import { DocumentChunk } from '../../models/DocumentChunk.js';
import { logOpenAiError } from '../../models/OpenAiErrorLog.js';
import { getEmbedding, cosineSimilarity } from '../knowledgeBase/vectorSearch.js';
import { detectAndUpdateContactInfo } from '../crm/leadCaptureService.js';
import { config } from '../../config/config.js';

/**
 * Executes a full RAG cycle (retrieve matching documents, fetch history, call gpt-4o-mini)
 * and writes user and assistant messages to database.
 * Operates inside the company's runWithTenant context.
 */
export const generateReply = async (companyId, conversationId, userMessage) => {
  const apiKey = process.env.OPENAI_API_KEY;

  // 1. Save user message to database immediately
  await Message.create({
    conversationId,
    role: 'user',
    content: userMessage
  });

  // Execute background lead capture parser (extract email/phone details)
  await detectAndUpdateContactInfo(conversationId, userMessage).catch((err) => {
    process.stderr.write(`Lead capture parsing error: ${err.message}\n`);
  });

  // 2. Fetch top 5 relevant chunks from active company knowledge base
  let contextText = '';
  try {
    if (!apiKey) {
      contextText = 'System Error: OpenAI API Key is missing. Knowledge base indexing is unavailable.';
    } else {
      const userVector = await getEmbedding(userMessage);
      
      // Scoped to active tenant automatically via Mongoose plugin
      const chunks = await DocumentChunk.find().populate('documentId');
      
      // Filter out invalid/unindexed parent documents
      const activeChunks = chunks.filter(
        (c) => c.documentId && c.documentId.status === 'indexed'
      );

      if (activeChunks.length > 0) {
        // Calculate similarity scores
        const scoredChunks = activeChunks.map((c) => ({
          content: c.content,
          score: cosineSimilarity(userVector, c.embedding)
        }));

        // Sort descending and grab top 5
        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks.slice(0, 5);

        // Join chunks
        contextText = topChunks.map((c) => c.content).join('\n\n');
      } else {
        contextText = 'No indexed documents found in the company knowledge base yet.';
      }
    }
  } catch (err) {
    process.stderr.write(`RAG Retrieval Warning: ${err.message}\n`);
    contextText = 'Error retrieving document context chunks.';
  }

  // 3. Retrieve short term memory context (last 6 messages including the user message we just saved)
  const historyDocs = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(6);
  
  // Sort chronologically (oldest to newest)
  const chronologicalHistory = historyDocs.reverse();
  const chatHistory = chronologicalHistory.map((m) => ({
    role: m.role,
    content: m.content
  }));

  // 4. Construct System Prompt
  const systemPrompt = `You are a helpful support assistant for this business. Answer ONLY using the provided context. If the answer isn't in the context, say you don't have that information and offer to connect them with a human. Do not make up facts.

Context:
${contextText}`;

  // 5. Call OpenAI Completion (gpt-4o-mini)
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not defined.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const msg = errorPayload.error?.message || response.statusText;
      throw new Error(`OpenAI API error (${response.status}): ${msg}`);
    }

    const result = await response.json();
    const assistantReply = result.choices?.[0]?.message?.content;

    if (!assistantReply) {
      throw new Error('Empty completion choice returned from OpenAI.');
    }

    // 6. Save assistant reply to message history
    await Message.create({
      conversationId,
      role: 'assistant',
      content: assistantReply
    });

    return assistantReply;
  } catch (err) {
    await logOpenAiError('chat', err);
    process.stderr.write(`AI Chat Completion Failure [ConvID: ${conversationId}]: ${err.message}\n`);
    throw new Error('Something went wrong, please try again.');
  }
};
