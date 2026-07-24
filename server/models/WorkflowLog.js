import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const workflowLogSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required'],
      index: true
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowRule',
      required: [true, 'Workflow rule reference is required'],
      index: true
    },
    actionType: {
      type: String,
      enum: {
        values: ['generate_summary', 'update_lead_status', 'send_whatsapp_followup', 'send_email_followup'],
        message: 'Action type must be generate_summary, update_lead_status, send_whatsapp_followup, or send_email_followup'
      },
      required: [true, 'Action type is required']
    },
    status: {
      type: String,
      enum: {
        values: ['success', 'failed'],
        message: 'Status must be success or failed'
      },
      required: [true, 'Execution status is required']
    },
    errorMessage: {
      type: String,
      default: null
    },
    executedAt: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Register the tenant plugin to enforce scoped company checks automatically
workflowLogSchema.plugin(tenantPlugin);

export const WorkflowLog = mongoose.model('WorkflowLog', workflowLogSchema);
export default WorkflowLog;
