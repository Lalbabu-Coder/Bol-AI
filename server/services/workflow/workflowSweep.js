import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';
import { runWorkflows } from './workflowEngine.js';
import { runWithTenant } from '../../utils/tenantContext.js';

/**
 * Initializes a background worker sweep running every 60 seconds.
 * Scans for active web_chat and whatsapp conversations that have been inactive
 * (no new messages) for at least 5 minutes, closes them, and runs their workflow rules.
 * 
 * NOTE: This simple interval-sweep approach is enough for this stage of development.
 * It should transition to a proper job queue system (like Bull/BullMQ/Kafka) as the volume of conversations grows.
 */
export const startWorkflowSweep = () => {
  setInterval(async () => {
    try {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Find all active web_chat and whatsapp conversations across all tenants
      const activeConversations = await Conversation.find({
        status: 'active',
        channel: { $in: ['web_chat', 'whatsapp'] }
      });

      for (const conv of activeConversations) {
        // Query the latest message sent in this conversation
        const latestMsg = await Message.findOne({ conversationId: conv._id })
          .sort({ createdAt: -1 });

        const referenceTime = latestMsg ? latestMsg.createdAt : conv.createdAt;

        // If inactive for more than 5 minutes, run workflows
        if (referenceTime < fiveMinsAgo) {
          const companyIdStr = conv.companyId.toString();

          await runWithTenant(companyIdStr, async () => {
            try {
              process.stdout.write(`Workflow sweep: Closing conversation ${conv._id} due to 5-minute inactivity.\n`);
              await runWorkflows(conv._id);
            } catch (err) {
              process.stderr.write(`Workflow sweep error for Conversation ${conv._id}: ${err.message}\n`);
            }
          });
        }
      }
    } catch (err) {
      process.stderr.write(`Workflow background sweep task error: ${err.message}\n`);
    }
  }, 60000);

  process.stdout.write('Background workflow sweep task started (60s check frequency).\n');
};
