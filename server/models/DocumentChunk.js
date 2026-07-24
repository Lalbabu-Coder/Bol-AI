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
          return Array.isArray(v) && v.length === 1536; // OpenAI text-embedding-3-small vector size
        },
        message: 'Embedding vector must be exactly 1536 dimensions'
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
