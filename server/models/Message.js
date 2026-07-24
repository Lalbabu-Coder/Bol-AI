import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required'],
      index: true
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'assistant'],
        message: 'Role must be user or assistant'
      },
      required: [true, 'Role is required']
    },
    content: {
      type: String,
      required: [true, 'Message content text is required']
    }
  },
  {
    timestamps: true
  }
);

// Register the tenant plugin to enforce scoped company checks automatically
messageSchema.plugin(tenantPlugin);

export const Message = mongoose.model('Message', messageSchema);
export default Message;
