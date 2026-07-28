import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { Company } from '../models/Company.js';
import { testImapConnection } from '../services/email/imapService.js';
import { testSmtpConnection } from '../services/email/smtpService.js';
import { BadRequestError, NotFoundError, ForbiddenError, AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkChannelAllowed } from '../services/billing/usageLimitService.js';

const router = Router();

/**
 * POST /api/email/connect
 * PROTECTED route. Validates IMAP and SMTP credentials, tests logins, and persists email configuration.
 */
router.post('/connect', protect, asyncHandler(async (req, res) => {
  if (req.user.impersonatorId) {
    throw new ForbiddenError('Channel configuration updates are blocked during support impersonation sessions.', 'IMPERSONATION_BLOCKED');
  }

  const { imapHost, imapPort, smtpHost, smtpPort, emailAddress, appPassword } = req.body;

  // Gate connection if channel is not allowed on active plan
  const channelCheck = await checkChannelAllowed(req.user.companyId, 'email');
  if (!channelCheck.allowed) {
    throw new AppError(channelCheck.message, 403, 'CHANNEL_NOT_ALLOWED');
  }

  if (!imapHost || !imapPort || !smtpHost || !smtpPort || !emailAddress || !appPassword) {
    throw new BadRequestError('All fields (imapHost, imapPort, smtpHost, smtpPort, emailAddress, appPassword) are required.', 'MISSING_CREDENTIALS');
  }

  // 1. Test IMAP connection
  try {
    await testImapConnection({ imapHost, imapPort, emailAddress, appPassword });
  } catch (err) {
    throw new BadRequestError(`IMAP authentication failed: ${err.message}`, 'IMAP_TEST_FAILED');
  }

  // 2. Test SMTP connection
  try {
    await testSmtpConnection({ smtpHost, smtpPort, emailAddress, appPassword });
  } catch (err) {
    throw new BadRequestError(`SMTP authentication failed: ${err.message}`, 'SMTP_TEST_FAILED');
  }

  // 3. Save configuration to Company profile
  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  company.emailConfig.imapHost = imapHost;
  company.emailConfig.imapPort = parseInt(imapPort, 10);
  company.emailConfig.smtpHost = smtpHost;
  company.emailConfig.smtpPort = parseInt(smtpPort, 10);
  company.emailConfig.emailAddress = emailAddress;
  company.emailConfig.appPassword = appPassword;
  company.emailConfig.isConnected = true;
  if (!company.emailConfig.firstConnectedAt) {
    company.emailConfig.firstConnectedAt = new Date();
  }

  await company.save();

  res.status(200).json({
    success: true,
    message: 'Email inbox connected and verified successfully.',
    data: {
      imapHost: company.emailConfig.imapHost,
      imapPort: company.emailConfig.imapPort,
      smtpHost: company.emailConfig.smtpHost,
      smtpPort: company.emailConfig.smtpPort,
      emailAddress: company.emailConfig.emailAddress,
      isConnected: company.emailConfig.isConnected,
      lastCheckedAt: company.emailConfig.lastCheckedAt
    }
  });
}));

/**
 * GET /api/email/config
 * PROTECTED route. Retrieves email configuration state for active company (masks appPassword).
 */
router.get('/config', protect, asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  const emailConfig = company.emailConfig || {};

  res.status(200).json({
    success: true,
    data: {
      imapHost: emailConfig.imapHost || '',
      imapPort: emailConfig.imapPort || 993,
      smtpHost: emailConfig.smtpHost || '',
      smtpPort: emailConfig.smtpPort || 587,
      emailAddress: emailConfig.emailAddress || '',
      isConnected: emailConfig.isConnected || false,
      lastCheckedAt: emailConfig.lastCheckedAt || null
    }
  });
}));

/**
 * POST /api/email/disconnect
 * PROTECTED route. Disconnects email channel for the active company workspace.
 */
router.post('/disconnect', protect, asyncHandler(async (req, res) => {
  if (req.user.impersonatorId) {
    throw new ForbiddenError('Channel configuration updates are blocked during support impersonation sessions.', 'IMPERSONATION_BLOCKED');
  }

  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  company.emailConfig.isConnected = false;
  await company.save();

  res.status(200).json({
    success: true,
    message: 'Email inbox channel disconnected successfully.',
    data: {
      isConnected: company.emailConfig.isConnected
    }
  });
}));

export default router;
