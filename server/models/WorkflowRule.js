import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['generate_summary', 'update_lead_status', 'send_whatsapp_followup', 'send_email_followup'],
        message: 'Action type must be generate_summary, update_lead_status, send_whatsapp_followup, or send_email_followup'
      },
      required: [true, 'Action type is required']
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const workflowRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workflow rule name is required'],
      trim: true
    },
    trigger: {
      type: String,
      enum: {
        values: ['conversation_ended'],
        message: 'Trigger must be conversation_ended'
      },
      default: 'conversation_ended',
      required: [true, 'Trigger is required']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    actions: {
      type: [actionSchema],
      default: []
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Register the tenant plugin to enforce scoped company checks automatically
workflowRuleSchema.plugin(tenantPlugin);

export const WorkflowRule = mongoose.model('WorkflowRule', workflowRuleSchema);
export default WorkflowRule;
