import { config } from '../../config/config.js';

/**
 * Manually computes the cosine similarity between two vectors.
 * Since OpenAI embeddings are normalized to unit length (magnitude of 1),
 * the cosine similarity is theoretically equivalent to the dot product.
 * To be robust, we implement the full standard cosine similarity formula.
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
 * Generates vector embedding from OpenAI (text-embedding-3-small)
 * Model output length: 1536 dimensions
 */
export const getEmbedding = async (text) => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not defined.');
  }

  // Sanitize input (remove double newlines and escape returns)
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
    throw new Error(`Failed to generate embeddings: ${err.message}`);
  }
};
