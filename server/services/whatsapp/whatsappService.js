import { Company } from '../../models/Company.js';

/**
 * Sends a WhatsApp message via the Meta WhatsApp Cloud API.
 * Uses the saved Phone Number ID and Access Token for the target company.
 */
export const sendMessage = async (companyId, toPhoneNumber, messageText) => {
  // Scoped within active companyId (tenant checks run automatically in context)
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Workspace company profile not found.');
  }

  const { phoneNumberId, accessToken, isConnected } = company.whatsappConfig || {};

  if (!isConnected || !phoneNumberId || !accessToken) {
    throw new Error('WhatsApp Cloud API channel is not connected or credentials are missing for this company.');
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText
        }
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const msg = errorPayload.error?.message || response.statusText;
      throw new Error(`Meta Graph API returned error (${response.status}): ${msg}`);
    }

    const payload = await response.json();
    return payload;
  } catch (err) {
    process.stderr.write(`Failed to send WhatsApp message to ${toPhoneNumber}: ${err.message}\n`);
    throw err;
  }
};

/**
 * Defensive webhook parser.
 * Extracts sender telephone number, message text, visitor name, and phone ID.
 * Returns null if the payload is not a valid incoming text message change.
 */
export const parseIncomingMessage = (payload) => {
  try {
    if (payload.object !== 'whatsapp_business_account') return null;

    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    
    // Check if the change corresponds to a message field event
    if (change?.field !== 'messages') return null;
    
    const metadata = value?.metadata;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    // Ensure we have a valid text message
    if (!metadata || !message || message.type !== 'text') return null;

    const phoneNumberId = metadata.phone_number_id;
    const senderPhone = message.from; // Phone number of the sender
    const messageText = message.text?.body;
    const senderName = contact?.profile?.name || 'WhatsApp Contact';

    if (!phoneNumberId || !senderPhone || !messageText) return null;

    return {
      phoneNumberId,
      senderPhone,
      senderName,
      messageText
    };
  } catch (err) {
    process.stderr.write(`WhatsApp Payload Parser Error: ${err.message}\n`);
    return null;
  }
};
