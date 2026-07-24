import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true
    },
    sourceType: {
      type: String,
      enum: {
        values: ['pdf', 'docx', 'faq', 'url'],
        message: 'sourceType must be pdf, docx, faq, or url'
      },
      required: [true, 'Source type is required']
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'indexed', 'failed'],
        message: 'Status must be pending, processing, indexed, or failed'
      },
      default: 'pending'
    },
    chunkCount: {
      type: Number,
      default: 0
    },
    errorDetail: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Register the tenant plugin to enforce scoped company checks automatically
documentSchema.plugin(tenantPlugin);

export const Document = mongoose.model('Document', documentSchema);
export default Document;
