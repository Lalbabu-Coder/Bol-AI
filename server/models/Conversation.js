import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const conversationSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: {
        values: ['web_chat', 'whatsapp', 'phone'],
        message: 'Channel must be web_chat, whatsapp, or phone'
      },
      default: 'web_chat',
      required: true
    },
    visitorId: {
      type: String, // Client-side generated UUID or Twilio caller identifier
      required: [true, 'Visitor ID is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'closed'],
        message: 'Status must be active or closed'
      },
      default: 'active',
      required: true
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
      index: true
    },
    callDuration: {
      type: Number,
      default: null
    },
    recordingUrl: {
      type: String,
      default: null
    },
    summary: {
      type: String,
      default: null
    },
    detectedOutcome: {
      type: String,
      default: null
    },
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Register the tenant plugin to enforce scoped company checks automatically
conversationSchema.plugin(tenantPlugin);

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
