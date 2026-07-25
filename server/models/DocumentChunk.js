import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document reference is required'],
      index: true
    },
    content: {
      type: String,
      required: [true, 'Chunk content text is required']
    },
    embedding: {
      type: [Number],
      required: [true, 'Vector embedding is required'],
      validate: {
        validator: function (v) {
          // Gemini text-embedding-004 outputs 768 dimensions; OpenAI text-embedding-3-small outputs 1536 dimensions.
          // Note: If switching AI_PROVIDER between OpenAI and Gemini, existing indexed documents must be re-indexed.
          return Array.isArray(v) && (v.length === 768 || v.length === 1536 || v.length === 3072);
        },
        message: 'Embedding vector must match supported dimensions (768 for Gemini text-embedding-004, 1536 for OpenAI)'
      }
    },
    chunkIndex: {
      type: Number,
      required: [true, 'Chunk index sequence is required']
    }
  },
  {
    timestamps: true
  }
);

// Register the tenant plugin to enforce scoped company checks automatically
documentChunkSchema.plugin(tenantPlugin);

export const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema);
export default DocumentChunk;
