import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/config.js';

/**
 * Manually computes the cosine similarity between two vectors.
 * Works for any matching vector dimensions (e.g. 768 for Gemini, 1536 for OpenAI).
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Generates vector embedding.
 * Default AI Provider: 'gemini' (uses Google Generative AI SDK: text-embedding-004)
 * Alternate AI Provider: 'openai' (uses OpenAI: text-embedding-3-small)
 * 
 * Note: Gemini text-embedding-004 produces 768-dimensional vector embeddings
 * (vs OpenAI text-embedding-3-small which produces 1536-dimensional vectors).
 * If switching AI_PROVIDER between 'gemini' and 'openai', previously indexed documents
 * must be purged and re-indexed to ensure vector dimensions match.
 */
export const getEmbedding = async (text) => {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  // ----------------------------------------------------
  // GEMINI PROVIDER (Default - Free Tier)
  // ----------------------------------------------------
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined in server/.env.');
    }

    const sanitizedText = text.replace(/\n/g, ' ');
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
      // Try text-embedding-004 via Google Generative AI SDK
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(sanitizedText);
      
      if (result && result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
      throw new Error('Empty embedding values returned from Gemini SDK.');
    } catch (err) {
      // Fallback model check if text-embedding-004 throws 404 on specific API keys
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
        const fallbackResult = await fallbackModel.embedContent(sanitizedText);
        if (fallbackResult && fallbackResult.embedding && fallbackResult.embedding.values) {
          return fallbackResult.embedding.values;
        }
      } catch (innerErr) {
        process.stderr.write(`Gemini Embedding Error: ${err.message}\n`);
        throw err;
      }
      throw err;
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

    const sanitizedText = text.replace(/\n/g, ' ');

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          input: sanitizedText,
          model: 'text-embedding-3-small'
        })
      });

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({}));
        const message = errorResponse.error?.message || response.statusText;
        throw new Error(`OpenAI API error (${response.status}): ${message}`);
      }

      const payload = await response.json();
      
      if (!payload.data || !payload.data[0] || !payload.data[0].embedding) {
        throw new Error('Malformed response from OpenAI Embeddings endpoint.');
      }

      return payload.data[0].embedding;
    } catch (err) {
      throw new Error(`Failed to generate OpenAI embeddings: ${err.message}`);
    }
  }

  throw new Error(`Unsupported AI_PROVIDER '${provider}'. Supported options: 'gemini', 'openai'.`);
};
