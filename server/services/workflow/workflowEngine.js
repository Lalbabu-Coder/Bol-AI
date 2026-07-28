import { sendEmail as sendMail } from '../email/smtpService.js';
import { Conversation } from '../../models/Conversation.js';
import { Contact } from '../../models/Contact.js';
import { WorkflowRule } from '../../models/WorkflowRule.js';
import { WorkflowLog } from '../../models/WorkflowLog.js';
import { generateConversationSummary } from './summaryService.js';
import { sendMessage as sendWhatsAppMessage } from '../whatsapp/whatsappService.js';
import { runWithTenant } from '../../utils/tenantContext.js';

/**
 * Closes the conversation session and executes all active workflow rules.
 * Runs in the company's tenant context.
 * 
 * @param {string} conversationId 
 */
export const runWorkflows = async (conversationId) => {
  // 1. Fetch Conversation across companies to get companyId
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new Error(`Conversation with ID ${conversationId} not found.`);
  }

  const companyIdStr = conversation.companyId.toString();

  // 2. Execute remaining logic inside the company's tenant context
  await runWithTenant(companyIdStr, async () => {
    // Mark conversation as closed/ended if not already
    if (conversation.status !== 'closed') {
      conversation.status = 'closed';
      await conversation.save();
    }

    // Fetch all active rules for this company with trigger "conversation_ended"
    const rules = await WorkflowRule.find({
      trigger: 'conversation_ended',
      isActive: true
    });

    if (rules.length === 0) {
      process.stdout.write(`No active workflow rules found for company ${companyIdStr}.\n`);
      return;
    }

    // Process rules sequentially
    for (const rule of rules) {
      let summaryText = conversation.summary || '';

      // Check if rule contains a summary generation action. Run it first.
      const summaryAction = rule.actions.find((a) => a.type === 'generate_summary');
      if (summaryAction) {
        try {
          summaryText = await generateConversationSummary(conversationId);
          
          await WorkflowLog.create({
            conversationId,
            ruleId: rule._id,
            actionType: 'generate_summary',
            status: 'success',
            executedAt: new Date()
          });
        } catch (err) {
          await WorkflowLog.create({
            conversationId,
            ruleId: rule._id,
            actionType: 'generate_summary',
            status: 'failed',
            errorMessage: err.message,
            executedAt: new Date()
          });
        }
      }

      // Execute all other actions in the rule
      const otherActions = rule.actions.filter((a) => a.type !== 'generate_summary');
      for (const action of otherActions) {
        try {
          switch (action.type) {
            case 'update_lead_status': {
              const { newStatus } = action.config || {};
              if (!newStatus) {
                throw new Error('Action config is missing required parameter: newStatus.');
              }

              // Update lead status of the Contact associated with Conversation
              if (!conversation.contactId) {
                throw new Error('Conversation has no associated Contact.');
              }

              const contact = await Contact.findById(conversation.contactId);
              if (!contact) {
                throw new Error(`Contact with ID ${conversation.contactId} associated with conversation was not found.`);
              }

              contact.leadStatus = newStatus;
              await contact.save();
              break;
            }

            case 'send_whatsapp_followup': {
              const { messageTemplate } = action.config || {};
              if (!messageTemplate) {
                throw new Error('Action config is missing required parameter: messageTemplate.');
              }

              if (!conversation.contactId) {
                throw new Error('Conversation has no associated Contact.');
              }

              const contact = await Contact.findById(conversation.contactId);
              if (!contact) {
                throw new Error(`Contact with ID ${conversation.contactId} associated with conversation was not found.`);
              }

              if (!contact.phone) {
                throw new Error('Associated Contact does not have a phone number registered.');
              }

              const formattedMessage = messageTemplate.replace(/\{\{summary\}\}/g, summaryText);
              
              // Dispatch WhatsApp message
              await sendWhatsAppMessage(companyIdStr, contact.phone, formattedMessage);
              break;
            }

            case 'send_email_followup': {
              const { subject, bodyTemplate } = action.config || {};
              if (!subject || !bodyTemplate) {
                throw new Error('Action config is missing required parameters: subject or bodyTemplate.');
              }

              if (!conversation.contactId) {
                throw new Error('Conversation has no associated Contact.');
              }

              const contact = await Contact.findById(conversation.contactId);
              if (!contact) {
                throw new Error(`Contact with ID ${conversation.contactId} associated with conversation was not found.`);
              }

              if (!contact.email) {
                throw new Error('Associated Contact does not have an email address registered.');
              }

              const formattedSubject = subject.replace(/\{\{summary\}\}/g, summaryText);
              const formattedBody = bodyTemplate.replace(/\{\{summary\}\}/g, summaryText);

              // Dispatch Email follow-up
              await sendMail({
                to: contact.email,
                subject: formattedSubject,
                text: formattedBody
              });
              break;
            }

            default:
              throw new Error(`Unsupported action type: ${action.type}`);
          }

          // Log success to WorkflowLog
          await WorkflowLog.create({
            conversationId,
            ruleId: rule._id,
            actionType: action.type,
            status: 'success',
            executedAt: new Date()
          });
        } catch (err) {
          // Log failure to WorkflowLog
          await WorkflowLog.create({
            conversationId,
            ruleId: rule._id,
            actionType: action.type,
            status: 'failed',
            errorMessage: err.message,
            executedAt: new Date()
          });
        }
      }
    }
  });
};
