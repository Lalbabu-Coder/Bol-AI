import { Conversation } from '../../models/Conversation.js';
import { Contact } from '../../models/Contact.js';

/**
 * Parses user message content for contact details (email / phone) via regex.
 * If found and the fields are empty on the linked Contact profile, updates them.
 * Operates inside the company's runWithTenant context.
 */
export const detectAndUpdateContactInfo = async (conversationId, messageText) => {
  try {
    // 1. Define strict matching expressions to capture contact details while avoiding false positives
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    
    // Matches standard US formats: +1-555-555-5555, (555) 555-5555, 555-555-5555
    // AND plain sequences of 9 to 15 digits (standard for international numbers)
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{9,15}/;

    const emailMatch = messageText.match(emailRegex);
    const phoneMatch = messageText.match(phoneRegex);

    if (!emailMatch && !phoneMatch) return;

    // 2. Fetch the current conversation (automatically scoped by tenantPlugin if running in context)
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.contactId) return;

    // 3. Fetch the linked Contact profile
    const contact = await Contact.findById(conversation.contactId);
    if (!contact) return;

    let isModified = false;

    // Update email if detected and not currently set
    if (emailMatch && !contact.email) {
      contact.email = emailMatch[0].toLowerCase();
      isModified = true;
    }

    // Update phone if detected and not currently set
    if (phoneMatch && !contact.phone) {
      contact.phone = phoneMatch[0].trim();
      isModified = true;
    }

    if (isModified) {
      contact.lastContactedAt = new Date();
      await contact.save();
    }
  } catch (err) {
    process.stderr.write(`CRM Lead Capture Warning [ConvID: ${conversationId}]: ${err.message}\n`);
  }
};
export default detectAndUpdateContactInfo;
