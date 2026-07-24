import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Unknown',
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      enum: {
        values: ['web_chat', 'whatsapp', 'phone', 'email', 'instagram', 'manual'],
        message: 'Source must be web_chat, whatsapp, phone, email, instagram, or manual'
      },
      default: 'web_chat',
      required: true
    },
    leadStatus: {
      type: String,
      enum: {
        values: ['new', 'contacted', 'qualified', 'converted', 'lost'],
        message: 'Lead status must be new, contacted, qualified, converted, or lost'
      },
      default: 'new',
      required: true
    },
    tags: {
      type: [String],
      default: []
    },
    lastContactedAt: {
      type: Date,
      default: Date.now
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for performant lookups (email/phone search per company)
// We do NOT use unique: true because multiple unknown/empty profiles can coexist.
contactSchema.index({ companyId: 1, email: 1 });
contactSchema.index({ companyId: 1, phone: 1 });

// Register the tenant plugin to enforce scoped company checks automatically
contactSchema.plugin(tenantPlugin);

export const Contact = mongoose.model('Contact', contactSchema);
export default Contact;
