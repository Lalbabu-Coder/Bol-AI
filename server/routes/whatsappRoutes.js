import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { Company } from '../models/Company.js';
import { Conversation } from '../models/Conversation.js';
import { Contact } from '../models/Contact.js';
import { sendMessage, parseIncomingMessage } from '../services/whatsapp/whatsappService.js';
import { generateReply } from '../services/chat/aiChatService.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { BadRequestError, NotFoundError, ForbiddenError, AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkLimit, checkChannelAllowed } from '../services/billing/usageLimitService.js';
import { validateWhatsappConnect } from '../middleware/validation.js';
import { validateMetaSignature } from '../middleware/webhookAuth.js';

const router = Router();

/**
 * GET /api/whatsapp/webhook
 * PUBLIC route. Handles Meta's webhook verify handshake.
 */
router.get('/webhook', asyncHandler(async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token) {
    // Audit active companies to find a token match (since handshake contains no companyId)
    const company = await Company.findOne({ 'whatsappConfig.webhookVerifyToken': token });
    
    if (company) {
      // Respond to Meta with plain text challenge
      return res.status(200).send(challenge);
    }
  }

  res.status(403).send('Verification failed.');
}));

/**
 * POST /api/whatsapp/webhook
 * PUBLIC route. Receives incoming WhatsApp text callbacks from Meta.
 */
router.post('/webhook', validateMetaSignature, asyncHandler(async (req, res) => {
  const parsed = parseIncomingMessage(req.body);

  // If not a text message or invalid payload, return 200 to acknowledge Meta and ignore
  if (!parsed) {
    return res.status(200).send('EVENT_RECEIVED_BUT_IGNORED');
  }

  const { phoneNumberId, senderPhone, senderName, messageText } = parsed;

  // Resolve the matching active company
  const company = await Company.findOne({ 'whatsappConfig.phoneNumberId': phoneNumberId });
  if (!company) {
    process.stderr.write(`WhatsApp Webhook Warning: Company for phoneId ${phoneNumberId} not found.\n`);
    return res.status(200).send('COMPANY_NOT_FOUND');
  }

  if (!company.whatsappConfig.isConnected) {
    return res.status(200).send('COMPANY_WHATSAPP_DISCONNECTED');
  }

  const companyId = company._id.toString();

  // Run the conversation logic inside the company tenant scope
  await runWithTenant(companyId, async () => {
    // Check if channel is allowed on plan
    const channelCheck = await checkChannelAllowed(companyId, 'whatsapp');
    if (!channelCheck.allowed) {
      process.stderr.write(`WhatsApp channel blocked for company ${companyId}: ${channelCheck.message}\n`);
      return;
    }

    // a. Find or create Contact matching sender phone number
    let contact = await Contact.findOne({ phone: senderPhone, isDeleted: false });
    if (!contact) {
      contact = await Contact.create({
        name: senderName,
        phone: senderPhone,
        source: 'whatsapp',
        leadStatus: 'new'
      });
    } else {
      // Update name if contact was previously created with an 'Unknown' default name
      if (contact.name === 'Unknown' && senderName !== 'WhatsApp Contact') {
        contact.name = senderName;
        await contact.save();
      }
    }

    // Heuristic CSAT Gating:
    // If incoming text is exactly 1-5, and a WhatsApp conversation was recently closed
    // (< 10 mins ago) without a rating, interpret as CSAT feedback rating.
    const cleanMsg = messageText.trim();
    const isRatingValue = /^[1-5]$/.test(cleanMsg);
    if (isRatingValue) {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentlyClosedConv = await Conversation.findOne({
        contactId: contact._id,
        channel: 'whatsapp',
        status: 'closed',
        satisfactionRating: null,
        updatedAt: { $gte: tenMinsAgo }
      }).sort({ updatedAt: -1 });

      if (recentlyClosedConv) {
        recentlyClosedConv.satisfactionRating = parseInt(cleanMsg, 10);
        await recentlyClosedConv.save();

        await sendMessage(companyId, senderPhone, 'Thank you for your feedback rating!');
        return;
      }
    }

    // b. Find or create active Conversation with channel "whatsapp"
    let conversation = await Conversation.findOne({
      contactId: contact._id,
      channel: 'whatsapp',
      status: 'active'
    });

    if (!conversation) {
      // Check active conversations monthly limit
      const limitCheck = await checkLimit(companyId, 'maxConversationsPerMonth');
      if (!limitCheck.allowed) {
        process.stderr.write(`Conversation limit reached for company ${companyId}: ${limitCheck.message}\n`);
        return;
      }

      conversation = await Conversation.create({
        visitorId: `whatsapp-${senderPhone}`,
        channel: 'whatsapp',
        status: 'active',
        contactId: contact._id
      });
    }

    // c. Save user message and fetch RAG AI reply
    const replyText = await generateReply(companyId, conversation._id, messageText);

    // d. Dispatch AI response back to customer on WhatsApp
    await sendMessage(companyId, senderPhone, replyText);
  });

  res.status(200).send('EVENT_RECEIVED');
}));

/**
 * POST /api/whatsapp/connect
 * PROTECTED route. Registers Meta Cloud API credentials and validates them.
 */
router.post('/connect', protect, validateWhatsappConnect, asyncHandler(async (req, res) => {
  if (req.user.impersonatorId) {
    throw new ForbiddenError('Channel configuration updates are blocked during support impersonation sessions.', 'IMPERSONATION_BLOCKED');
  }

  const { phoneNumberId, accessToken, businessAccountId } = req.body;

  // Gate connection if channel is not allowed
  const channelCheck = await checkChannelAllowed(req.user.companyId, 'whatsapp');
  if (!channelCheck.allowed) {
    throw new AppError(channelCheck.message, 403, 'CHANNEL_NOT_ALLOWED');
  }

  if (!phoneNumberId || !accessToken || !businessAccountId) {
    throw new BadRequestError('All fields (phoneNumberId, accessToken, businessAccountId) are required.', 'MISSING_CREDENTIALS');
  }

  // 1. Run a Meta Graph API query to test if the credentials work
  try {
    const testUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}`;
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      const msg = errorData.error?.message || testResponse.statusText;
      throw new Error(`Meta credentials trial failed: ${msg}`);
    }
  } catch (err) {
    throw new BadRequestError(`WhatsApp Credentials check failed: ${err.message}`, 'WHATSAPP_TEST_FAILED');
  }

  // 2. Save configurations to Company (scoped automatically to active user's companyId)
  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  company.whatsappConfig.phoneNumberId = phoneNumberId;
  company.whatsappConfig.accessToken = accessToken;
  company.whatsappConfig.businessAccountId = businessAccountId;
  company.whatsappConfig.isConnected = true;

  await company.save();

  res.status(200).json({
    success: true,
    message: 'WhatsApp Business API configured successfully and status is Connected.',
    data: {
      phoneNumberId: company.whatsappConfig.phoneNumberId,
      businessAccountId: company.whatsappConfig.businessAccountId,
      isConnected: company.whatsappConfig.isConnected,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/whatsapp/webhook`,
      webhookVerifyToken: company.whatsappConfig.webhookVerifyToken
    }
  });
}));

/**
 * GET /api/whatsapp/config
 * Protected. Fetches WhatsApp configuration state for the dashboard.
 */
router.get('/config', protect, asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      phoneNumberId: company.whatsappConfig.phoneNumberId || '',
      businessAccountId: company.whatsappConfig.businessAccountId || '',
      isConnected: company.whatsappConfig.isConnected,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/whatsapp/webhook`,
      webhookVerifyToken: company.whatsappConfig.webhookVerifyToken
    }
  });
}));

/**
 * POST /api/whatsapp/disconnect
 * PROTECTED route. Disconnects company WhatsApp channel.
 */
router.post('/disconnect', protect, asyncHandler(async (req, res) => {
  if (req.user.impersonatorId) {
    throw new ForbiddenError('Channel configuration updates are blocked during support impersonation sessions.', 'IMPERSONATION_BLOCKED');
  }

  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  company.whatsappConfig.isConnected = false;
  await company.save();

  res.status(200).json({
    success: true,
    message: 'WhatsApp Business API disconnected successfully.',
    data: {
      isConnected: company.whatsappConfig.isConnected
    }
  });
}));

export default router;
