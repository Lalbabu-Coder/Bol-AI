import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { Company } from '../models/Company.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { validateTwilioCredentials, generateTwiMLStreamResponse, startCallRecording } from '../services/voice/twilioService.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { BadRequestError, NotFoundError, ForbiddenError, AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkLimit, checkChannelAllowed } from '../services/billing/usageLimitService.js';
import { validateVoiceConnect } from '../middleware/validation.js';
import { validateTwilioSignature } from '../middleware/webhookAuth.js';

const router = Router();

/**
 * POST /api/voice/incoming-call
 * PUBLIC webhook. Triggered by Twilio when an inbound call hits the connected number.
 * Note: Twilio posts x-www-form-urlencoded body.
 */
router.post('/incoming-call', validateTwilioSignature, asyncHandler(async (req, res) => {
  const { companyId } = req.query;
  const { CallSid: callSid, From: fromNumber } = req.body;

  if (!companyId) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<Response><Reject reason="busy"/></Response>');
  }

  // Look up target company (bypassing tenant filter to verify connect status)
  const company = await Company.findById(companyId);
  if (!company || !company.voiceConfig?.isConnected) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<Response><Reject reason="rejected"/></Response>');
  }

  // Gating: check channel allowed
  const channelCheck = await checkChannelAllowed(companyId, 'phone');
  if (!channelCheck.allowed) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<Response><Say voice="alice">We are sorry, this line is temporarily disabled due to subscription limits.</Say><Reject reason="rejected"/></Response>');
  }

  // Gating: check conversations limit
  const limitCheck = await checkLimit(companyId, 'maxConversationsPerMonth');
  if (!limitCheck.allowed) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<Response><Say voice="alice">We are sorry, this line is temporarily disabled due to conversation limit rules.</Say><Reject reason="rejected"/></Response>');
  }

  // Start Twilio Call Recording in the background
  const callbackUrl = `${req.protocol}://${req.get('host')}/api/voice/recording-callback?companyId=${companyId}&callSid=${callSid}`;
  
  await startCallRecording(
    company.voiceConfig.twilioAccountSid,
    company.voiceConfig.twilioAuthToken,
    callSid,
    callbackUrl
  ).catch(err => {
    process.stderr.write(`Voice Agent Webhook Recording Trigger Warning: ${err.message}\n`);
  });

  // Return stream redirecting XML TwiML
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(generateTwiMLStreamResponse(companyId, callSid, fromNumber, req.get('host')));
}));

/**
 * POST /api/voice/recording-callback
 * PUBLIC webhook. Triggered by Twilio once the call recording file is fully saved.
 */
router.post('/recording-callback', validateTwilioSignature, asyncHandler(async (req, res) => {
  const { companyId, callSid } = req.query;
  const { RecordingUrl: recordingUrl, RecordingDuration: duration } = req.body;

  if (!companyId || !callSid) {
    return res.status(200).send('OK_BUT_IGNORED');
  }

  // Save details onto matching Conversation under appropriate tenant scope
  await runWithTenant(companyId, async () => {
    const conversation = await Conversation.findOne({ visitorId: `phone-${callSid}` });
    if (conversation) {
      conversation.recordingUrl = recordingUrl;
      conversation.callDuration = parseInt(duration, 10) || null;
      await conversation.save();
    }
  });

  res.status(200).send('RECORDING_PROCESSED');
}));

/**
 * GET /api/voice/config
 * PROTECTED route. Fetches Twilio configuration details.
 */
router.get('/config', protect, asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: {
      twilioAccountSid: company.voiceConfig.twilioAccountSid || '',
      twilioPhoneNumber: company.voiceConfig.twilioPhoneNumber || '',
      isConnected: company.voiceConfig.isConnected,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/voice/incoming-call?companyId=${company._id.toString()}`
    }
  });
}));

/**
 * POST /api/voice/connect
 * PROTECTED route. Registers twilio configurations and checks SID status.
 */
router.post('/connect', protect, validateVoiceConnect, asyncHandler(async (req, res) => {
  if (req.user.impersonatorId) {
    throw new ForbiddenError('Channel configuration updates are blocked during support impersonation sessions.', 'IMPERSONATION_BLOCKED');
  }

  const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = req.body;

  // Gate connection if channel is not allowed
  const channelCheck = await checkChannelAllowed(req.user.companyId, 'phone');
  if (!channelCheck.allowed) {
    throw new AppError(channelCheck.message, 403, 'CHANNEL_NOT_ALLOWED');
  }

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new BadRequestError('All fields (twilioAccountSid, twilioAuthToken, twilioPhoneNumber) are required.', 'MISSING_CREDENTIALS');
  }

  // 1. Verify credentials with Twilio
  const isValid = await validateTwilioCredentials(twilioAccountSid, twilioAuthToken);
  if (!isValid) {
    throw new BadRequestError('Twilio Account SID or Auth Token is invalid.', 'TWILIO_AUTH_FAILED');
  }

  // 2. Save settings to Company
  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  company.voiceConfig.twilioAccountSid = twilioAccountSid;
  company.voiceConfig.twilioAuthToken = twilioAuthToken;
  company.voiceConfig.twilioPhoneNumber = twilioPhoneNumber.trim();
  company.voiceConfig.isConnected = true;

  await company.save();

  res.status(200).json({
    success: true,
    message: 'Twilio Voice configuration connected successfully.',
    data: {
      twilioAccountSid: company.voiceConfig.twilioAccountSid,
      twilioPhoneNumber: company.voiceConfig.twilioPhoneNumber,
      isConnected: company.voiceConfig.isConnected,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/voice/incoming-call?companyId=${company._id.toString()}`
    }
  });
}));

/**
 * POST /api/voice/disconnect
 * PROTECTED route. Deactivates voice phone integration channel.
 */
router.post('/disconnect', protect, asyncHandler(async (req, res) => {
  if (req.user.impersonatorId) {
    throw new ForbiddenError('Channel configuration updates are blocked during support impersonation sessions.', 'IMPERSONATION_BLOCKED');
  }

  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  company.voiceConfig.isConnected = false;
  await company.save();

  res.status(200).json({
    success: true,
    message: 'Twilio Voice configuration disconnected successfully.',
    data: {
      isConnected: company.voiceConfig.isConnected
    }
  });
}));

/**
 * GET /api/voice/calls
 * PROTECTED route. Returns calls (conversations with channel 'phone').
 */
router.get('/calls', protect, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Filter scoped to phone channel automatically scoping by companyId via plugin
  const calls = await Conversation.find({ channel: 'phone' })
    .populate('contactId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Conversation.countDocuments({ channel: 'phone' });

  // Enrich with latest text snippet
  const enrichedCalls = await Promise.all(
    calls.map(async (call) => {
      const latestMsg = await Message.findOne({ conversationId: call._id }).sort({ createdAt: -1 });
      return {
        id: call._id,
        visitorId: call.visitorId,
        status: call.status,
        summary: call.summary,
        detectedOutcome: call.detectedOutcome,
        callDuration: call.callDuration,
        recordingUrl: call.recordingUrl,
        createdAt: call.createdAt,
        contact: call.contactId ? {
          id: call.contactId._id,
          name: call.contactId.name,
          phone: call.contactId.phone
        } : null,
        previewText: latestMsg ? latestMsg.content : 'No transcription recorded.'
      };
    })
  );

  res.status(200).json({
    success: true,
    data: enrichedCalls,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * GET /api/voice/calls/:id
 * PROTECTED route. Fetches detailed transcript history for call ID.
 */
router.get('/calls/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const call = await Conversation.findOne({ _id: id, channel: 'phone' }).populate('contactId');
  if (!call) {
    throw new NotFoundError('Voice call log not found or access denied.', 'CALL_NOT_FOUND');
  }

  // Scoped automatically to companyId via Mongoose plugin
  const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: {
      call: {
        id: call._id,
        visitorId: call.visitorId,
        callDuration: call.callDuration,
        recordingUrl: call.recordingUrl,
        summary: call.summary,
        detectedOutcome: call.detectedOutcome,
        createdAt: call.createdAt,
        contact: call.contactId ? {
          id: call.contactId._id,
          name: call.contactId.name,
          phone: call.contactId.phone
        } : null
      },
      messages
    }
  });
}));

export default router;
