import mongoose from 'mongoose';

const webhookFailureLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const WebhookFailureLog = mongoose.model('WebhookFailureLog', webhookFailureLogSchema);
export default WebhookFailureLog;
