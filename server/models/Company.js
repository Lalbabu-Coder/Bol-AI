import mongoose from 'mongoose';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/encryption.js';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Company slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    plan: {
      type: String,
      enum: {
        values: ['free', 'growth', 'enterprise'],
        message: 'Plan must be either free, growth, or enterprise'
      },
      default: 'free'
    },
    subscription: {
      planId: {
        type: String,
        enum: ['starter', 'growth', 'pro'],
        default: 'starter'
      },
      status: {
        type: String,
        enum: ['trialing', 'active', 'past_due', 'canceled'],
        default: 'trialing'
      },
      razorpaySubscriptionId: {
        type: String,
        default: null
      },
      razorpayCustomerId: {
        type: String,
        default: null
      },
      trialEndsAt: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      currentPeriodEnd: {
        type: Date,
        default: null
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    whatsappConfig: {
      phoneNumberId: {
        type: String,
        default: null
      },
      accessToken: {
        type: String,
        default: null // PRODUCTION NOTE: Always encrypt this token before writing to DB
      },
      businessAccountId: {
        type: String,
        default: null
      },
      isConnected: {
        type: Boolean,
        default: false
      },
      webhookVerifyToken: {
        type: String,
        default: () => crypto.randomBytes(16).toString('hex')
      }
    },
    voiceConfig: {
      twilioAccountSid: {
        type: String,
        default: null
      },
      twilioAuthToken: {
        type: String,
        default: null // PRODUCTION NOTE: Always encrypt this token before writing to DB
      },
      twilioPhoneNumber: {
        type: String,
        default: null
      },
      isConnected: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true // Auto-adds createdAt and updatedAt fields
  }
);

// Pre-save hook: Encrypt sensitive tokens on change
companySchema.pre('save', function (next) {
  if (this.whatsappConfig && this.isModified('whatsappConfig.accessToken') && this.whatsappConfig.accessToken) {
    this.whatsappConfig.accessToken = encrypt(this.whatsappConfig.accessToken);
  }
  if (this.voiceConfig && this.isModified('voiceConfig.twilioAuthToken') && this.voiceConfig.twilioAuthToken) {
    this.voiceConfig.twilioAuthToken = encrypt(this.voiceConfig.twilioAuthToken);
  }
  next();
});

// Post-init hook: Decrypt tokens after retrieval
companySchema.post('init', function (doc) {
  if (doc.whatsappConfig && doc.whatsappConfig.accessToken) {
    doc.whatsappConfig.accessToken = decrypt(doc.whatsappConfig.accessToken);
  }
  if (doc.voiceConfig && doc.voiceConfig.twilioAuthToken) {
    doc.voiceConfig.twilioAuthToken = decrypt(doc.voiceConfig.twilioAuthToken);
  }
});

// Post-save hook: Decrypt tokens back in-memory for active session use
companySchema.post('save', function (doc) {
  if (doc.whatsappConfig && doc.whatsappConfig.accessToken) {
    doc.whatsappConfig.accessToken = decrypt(doc.whatsappConfig.accessToken);
  }
  if (doc.voiceConfig && doc.voiceConfig.twilioAuthToken) {
    doc.voiceConfig.twilioAuthToken = decrypt(doc.voiceConfig.twilioAuthToken);
  }
});

export const Company = mongoose.model('Company', companySchema);
export default Company;
