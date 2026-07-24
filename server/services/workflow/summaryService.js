import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';
import { logOpenAiError } from '../../models/OpenAiErrorLog.js';

/**
 * Fetches the transcript of a conversation and prompts OpenAI (gpt-4o-mini)
 * to output a concise summary and a detected outcome classification.
 * Saves summary/detectedOutcome to the Conversation document and returns the summary text.
 * 
 * @param {string} conversationId 
 * @returns {Promise<string>} The generated summary string
 */
export const generateConversationSummary = async (conversationId) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not defined in the environment variables.');
  }

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

  // 2. Format transcript for OpenAI
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
    const responseContent = payload.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error('OpenAI returned an empty content choices block.');
    }

    const parsed = JSON.parse(responseContent.trim());
    const summary = parsed.summary || 'Summary unavailable.';
    let detectedOutcome = parsed.detectedOutcome || 'needs_followup';

    // Verify it is one of the allowed outcomes, fallback to needs_followup if not
    const validOutcomes = ['interested_lead', 'support_resolved', 'no_answer', 'needs_followup'];
    if (!validOutcomes.includes(detectedOutcome)) {
      detectedOutcome = 'needs_followup';
    }

    // 3. Update Conversation document
    await Conversation.findByIdAndUpdate(conversationId, {
      summary,
      detectedOutcome
    });

    return summary;
  } catch (err) {
    await logOpenAiError('summary', err);
    process.stderr.write(`Error generating summary for Conversation ${conversationId}: ${err.message}\n`);
    throw err;
  }
};
