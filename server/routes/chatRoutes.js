import { Router } from 'express';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';
import { Company } from '../models/Company.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { generateReply } from '../services/chat/aiChatService.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { BadRequestError, NotFoundError, ForbiddenError, AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkLimit, checkChannelAllowed } from '../services/billing/usageLimitService.js';

const router = Router();

/**
 * POST /api/chat/start
 * PUBLIC route. Starts a conversation for a specific tenant companyId.
 */
router.post('/start', asyncHandler(async (req, res) => {
  const { companyId } = req.body;

  if (!companyId) {
    throw new BadRequestError('Company ID is required to start a conversation.', 'MISSING_COMPANY_ID');
  }

  // Gating: check channel allowed & active conversation limit
  const channelCheck = await checkChannelAllowed(companyId, 'web_chat');
  if (!channelCheck.allowed) {
    throw new AppError(channelCheck.message, 403, 'CHANNEL_NOT_ALLOWED');
  }

  const limitCheck = await checkLimit(companyId, 'maxConversationsPerMonth');
  if (!limitCheck.allowed) {
    throw new AppError(limitCheck.message, 402, 'LIMIT_EXCEEDED');
  }

  // 1. Validate company exists and is active (bypassing tenant filter since public route)
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Workspace not found.', 'COMPANY_NOT_FOUND');
  }
  
  if (!company.isActive) {
    throw new ForbiddenError('This workspace is currently suspended or deactivated.', 'COMPANY_INACTIVE');
  }

  // 2. Generate anonymous visitor session parameters
  const visitorId = crypto.randomUUID();

  // 3. Create Contact and Conversation within correct company context
  let conversation;
  await runWithTenant(companyId, async () => {
    const contact = await Contact.create({
      name: 'Unknown',
      source: 'web_chat',
      leadStatus: 'new'
    });

    conversation = await Conversation.create({
      visitorId,
      channel: 'web_chat',
      status: 'active',
      contactId: contact._id
    });
  });

  res.status(201).json({
    success: true,
    message: 'Conversation session started successfully.',
    data: {
      conversationId: conversation._id,
      companyId: company._id,
      visitorId
    }
  });
}));

/**
 * POST /api/chat/message
 * PUBLIC route. Receives a user message and returns the AI reply.
 */
router.post('/message', asyncHandler(async (req, res) => {
  const { conversationId, message } = req.body;

  if (!conversationId || !message || !message.trim()) {
    throw new BadRequestError('Conversation ID and message content are required.', 'MISSING_PARAMETERS');
  }

  // 1. Find Conversation across all tenants (public endpoint, context is null)
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Active chat session not found.', 'CONVERSATION_NOT_FOUND');
  }

  if (conversation.status !== 'active') {
    throw new BadRequestError('This chat session has been closed.', 'CONVERSATION_CLOSED');
  }

  const companyId = conversation.companyId.toString();

  // 2. Run generateReply inside the target company tenant context
  const replyContent = await runWithTenant(companyId, async () => {
    return await generateReply(companyId, conversationId, message);
  });

  res.status(200).json({
    success: true,
    data: {
      role: 'assistant',
      content: replyContent
    }
  });
}));

/**
 * GET /api/chat/conversations
 * PROTECTED route. Lists all conversations for the authenticated company.
 */
router.get('/conversations', protect, asyncHandler(async (req, res) => {
  // Conversions query automatically scoped by companyId via plugin
  const conversations = await Conversation.find().populate('contactId').sort({ updatedAt: -1 });

  // Enrich conversation documents with their latest preview message
  const enrichedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const lastMessage = await Message.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 });
        
      return {
        id: conv._id,
        visitorId: conv.visitorId,
        channel: conv.channel,
        status: conv.status,
        summary: conv.summary,
        detectedOutcome: conv.detectedOutcome,
        contact: conv.contactId
          ? {
              id: conv.contactId._id,
              name: conv.contactId.name,
              email: conv.contactId.email,
              phone: conv.contactId.phone,
              leadStatus: conv.contactId.leadStatus
            }
          : null,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        lastMessage: lastMessage 
          ? {
              content: lastMessage.content,
              role: lastMessage.role,
              createdAt: lastMessage.createdAt
            } 
          : null
      };
    })
  );

  res.status(200).json({
    success: true,
    data: enrichedConversations
  });
}));

/**
 * GET /api/chat/conversations/:id/messages
 * PROTECTED route. Returns full chat log history for one conversation.
 */
router.get('/conversations/:id/messages', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Enforces companyId check: if conversation belongs to another company, Mongoose returns null
  const conversation = await Conversation.findById(id);
  if (!conversation) {
    throw new NotFoundError('Conversation not found in your company workspace.', 'CONVERSATION_NOT_FOUND');
  }

  // Scoped automatically to companyId via Mongoose plugin
  const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: messages
  });
}));

/**
 * POST /api/chat/:conversationId/rate
 * PUBLIC route. Saves user feedback score (1-5 satisfactionRating).
 */
router.post('/:conversationId/rate', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { rating } = req.body;

  const score = parseInt(rating, 10);
  if (isNaN(score) || score < 1 || score > 5) {
    throw new BadRequestError('Feedback score must be an integer between 1 and 5.', 'INVALID_RATING');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation session not found.', 'CONVERSATION_NOT_FOUND');
  }

  conversation.satisfactionRating = score;
  await conversation.save();

  res.status(200).json({
    success: true,
    message: 'Feedback rating saved successfully.'
  });
}));

export default router;
