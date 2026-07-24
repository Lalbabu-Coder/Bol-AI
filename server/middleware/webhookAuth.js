import crypto from 'crypto';
import { Company } from '../models/Company.js';
import { UnauthorizedError } from '../utils/errors.js';
import { WebhookFailureLog } from '../models/WebhookFailureLog.js';

/**
 * Middleware: Validates Twilio's X-Twilio-Signature header.
 * Uses the company's decrypted Twilio Auth Token and request metadata.
 */
export const validateTwilioSignature = async (req, res, next) => {
  try {
    const signature = req.headers['x-twilio-signature'];
    if (!signature) {
      process.stderr.write('Twilio Webhook Verification Warning: x-twilio-signature header missing.\n');
      throw new UnauthorizedError('Twilio authentication signature header is missing.', 'WEBHOOK_UNAUTHORIZED');
    }

    const { companyId } = req.query;
    if (!companyId) {
      throw new UnauthorizedError('Missing companyId query identifier parameter.', 'WEBHOOK_UNAUTHORIZED');
    }

    // Load company Twilio credentials
    const company = await Company.findById(companyId);
    if (!company || !company.voiceConfig || !company.voiceConfig.twilioAuthToken) {
      throw new UnauthorizedError('Company Twilio configurations not found.', 'WEBHOOK_UNAUTHORIZED');
    }

    const twilioAuthToken = company.voiceConfig.twilioAuthToken;

    // Twilio signature verification steps:
    // 1. Gather the full URL protocol, host, and path queried by Twilio
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;

    // 2. Sort body parameters alphabetically, concatenate key-values, and append to the URL string
    const params = { ...req.body };
    const sortedKeys = Object.keys(params).sort();
    let paramString = '';
    for (const key of sortedKeys) {
      paramString += key + params[key];
    }

    const signatureBase = url + paramString;

    // 3. Compute HMAC-SHA1 hash using Twilio Auth Token as key and encode in Base64
    const expectedSignature = crypto
      .createHmac('sha1', twilioAuthToken)
      .update(Buffer.from(signatureBase, 'utf-8'))
      .digest('base64');

    if (signature !== expectedSignature) {
      process.stderr.write(`Twilio Signature Check Failed for Call.\nGot: ${signature}\nExpected: ${expectedSignature}\n`);
      await WebhookFailureLog.create({
        channel: 'voice',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
      }).catch(() => {});
      throw new UnauthorizedError('Twilio webhook signature verification failed.', 'WEBHOOK_UNAUTHORIZED');
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Validates Meta's X-Hub-Signature-256 header.
 * Uses the raw request payload buffer and the META_APP_SECRET.
 */
export const validateMetaSignature = async (req, res, next) => {
  try {
    const signatureHeader = req.headers['x-hub-signature-256'];
    if (!signatureHeader) {
      process.stderr.write('Meta Webhook Verification Warning: x-hub-signature-256 header missing.\n');
      throw new UnauthorizedError('Meta signature header is missing.', 'WEBHOOK_UNAUTHORIZED');
    }

    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') {
      throw new UnauthorizedError('Invalid Meta signature header format.', 'WEBHOOK_UNAUTHORIZED');
    }

    const signature = parts[1];
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      throw new Error('META_APP_SECRET is not configured in the server environment.');
    }

    // Verify using the raw request body buffer
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      process.stderr.write(`Meta Signature Check Failed.\nGot: ${signature}\nExpected: ${expectedSignature}\n`);
      await WebhookFailureLog.create({
        channel: 'whatsapp',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
      }).catch(() => {});
      throw new UnauthorizedError('Meta webhook signature verification failed.', 'WEBHOOK_UNAUTHORIZED');
    }

    next();
  } catch (err) {
    next(err);
  }
};
