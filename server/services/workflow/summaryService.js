import { GoogleGenerativeAI } from '@google/generative-ai';
import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';
import { logOpenAiError } from '../../models/OpenAiErrorLog.js';

/**
 * Fetches the transcript of a conversation and prompts AI model
 * to output a concise summary and a detected outcome classification.
 * Supports AI_PROVIDER env var ('gemini' or 'openai'). Default: 'gemini'.
 * 
 * Signature and return type are strictly preserved:
 * @param {string} conversationId 
 * @returns {Promise<string>} The generated summary string
 */
export const generateConversationSummary = async (conversationId) => {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  // 1. Fetch conversation messages chronologically
  const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

  if (messages.length === 0) {
    const defaultSummary = 'No messages recorded in this conversation.';
    const defaultOutcome = 'no_answer';

    await Conversation.findByIdAndUpdate(conversationId, {
      summary: defaultSummary,
      detectedOutcome: defaultOutcome
    });

    return defaultSummary;
  }

  // 2. Format transcript
  const formattedTranscript = messages
    .map((m) => `${m.role === 'user' ? 'Customer' : 'AI Agent'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are a conversation audit assistant. Analyze the provided customer support chat or call transcript.
You must return a valid JSON object containing exactly two keys:
1. "summary": A concise 2-4 sentence summary summarizing what the customer wanted, how the agent responded, and the final state.
2. "detectedOutcome": Classify the conversation outcome. Choose exactly one of the following exact string values:
   - "interested_lead"
   - "support_resolved"
   - "no_answer"
   - "needs_followup"

Do not write any markdown code block formatting like \`\`\`json. Return only the raw JSON string.`;

  const userPrompt = `Conversation Transcript:\n${formattedTranscript}`;
  let responseContent = '';

  // ----------------------------------------------------
  // GEMINI PROVIDER (Default - Free Tier)
  // ----------------------------------------------------
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined in server/.env.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro-latest'];
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const response = await result.response;
        responseContent = response.text();
        if (responseContent) break;
      } catch (err) {
        lastError = err;
        process.stderr.write(`Gemini Summary model ${modelName} fallback attempt: ${err.message}\n`);
      }
    }

    if (!responseContent && lastError) {
      throw lastError;
    }
  }

  // ----------------------------------------------------
  // OPENAI PROVIDER (Behind AI_PROVIDER=openai flag)
  // ----------------------------------------------------
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not defined in server/.env.');
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
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const msg = errorPayload.error?.message || response.statusText;
        throw new Error(`OpenAI API returned error (${response.status}): ${msg}`);
      }

      const payload = await response.json();
      responseContent = payload.choices?.[0]?.message?.content;
    } catch (err) {
      await logOpenAiError('summary', err);
      process.stderr.write(`Error generating summary for Conversation ${conversationId}: ${err.message}\n`);
      throw err;
    }
  }

  if (!responseContent) {
    throw new Error('Empty summary output returned from AI provider.');
  }

  // Clean and parse JSON
  let cleaned = responseContent.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

  const parsed = JSON.parse(cleaned);
  const summary = parsed.summary || 'Summary unavailable.';
  let detectedOutcome = parsed.detectedOutcome || 'needs_followup';

  // Verify allowed outcomes
  const validOutcomes = ['interested_lead', 'support_resolved', 'no_answer', 'needs_followup'];
  if (!validOutcomes.includes(detectedOutcome)) {
    detectedOutcome = 'needs_followup';
  }

  // Update Conversation document
  await Conversation.findByIdAndUpdate(conversationId, {
    summary,
    detectedOutcome
  });

  return summary;
};
