import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Company } from '../../models/Company.js';
import { Contact } from '../../models/Contact.js';
import { Conversation } from '../../models/Conversation.js';
import { generateReply } from '../chat/aiChatService.js';
import { sendEmail } from './smtpService.js';
import { runWithTenant } from '../../utils/tenantContext.js';
import { checkLimit, checkChannelAllowed } from '../billing/usageLimitService.js';

/**
 * ⚠️ CRITICAL ARCHITECTURAL REQUIREMENT:
 * The Email Channel MUST be connected exclusively to a dedicated customer support inbox
 * (e.g. support@yourcompany.com or help@yourcompany.com).
 * 
 * DO NOT connect personal or general-purpose email inboxes that receive newsletters, marketing emails,
 * job alerts, or personal correspondence, as doing so may cause automated AI replies to be sent to non-customer senders.
 */

// Expanded regex pattern for common automated, system, no-reply, marketing, and newsletter senders
const AUTOMATED_SENDER_PATTERNS = /(no[-_]?reply|donotreply|mailer[-_]?daemon|notifications?@|accounts\.google\.com|postmaster@|bounce|auto-confirm|verify@|system@|news@|newsletter|marketing|promo|updates@|alerts?@|digest@|mailgun|sendgrid|mailchimp|constantcontact|substack|medium|hubspot|klaviyo|bandana|streeteasy|linkedin|indeed|glassdoor|jobalert|jobsearch|marketing@|promotions?@)/i;

// In-memory rate limiting tracker (companyId -> Array of timestamps in last 60 minutes)
const companyAutoReplyLogs = new Map();

/**
 * Evaluates whether a company has exceeded the hourly auto-reply rate limit (max 20 replies/hour).
 * Prevents runaway auto-reply loops or misconfigured inbox spam floods.
 * 
 * @param {string} companyIdStr 
 * @param {number} maxLimit 
 * @returns {boolean} True if allowed, false if limit exceeded
 */
const checkAutoReplyRateLimit = (companyIdStr, maxLimit = 20) => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  let timestamps = companyAutoReplyLogs.get(companyIdStr) || [];
  // Retain timestamps within the last 1 hour
  timestamps = timestamps.filter((t) => t > oneHourAgo);
  companyAutoReplyLogs.set(companyIdStr, timestamps);

  return timestamps.length < maxLimit;
};

/**
 * Records an auto-reply event timestamp for rate limiting tracking.
 * 
 * @param {string} companyIdStr 
 */
const recordAutoReply = (companyIdStr) => {
  const timestamps = companyAutoReplyLogs.get(companyIdStr) || [];
  timestamps.push(Date.now());
  companyAutoReplyLogs.set(companyIdStr, timestamps);
};

/**
 * Detects whether an incoming parsed email is a bulk marketing email, newsletter,
 * system notification, or automated message.
 * 
 * @param {Object} parsed Parsed email payload from mailparser
 * @param {string} senderAddress Lowercase sender email address
 * @returns {string|null} Reason string if bulk/automated email, or null if genuine message
 */
const getBulkOrAutomatedReason = (parsed, senderAddress) => {
  const headers = parsed.headers || new Map();

  // 1. Standard List-Unsubscribe / Campaign / Newsletter Headers
  if (
    headers.has('list-unsubscribe') ||
    headers.has('list-unsubscribe-post') ||
    headers.has('list-id') ||
    headers.has('x-mailing-list') ||
    headers.has('x-campaign') ||
    headers.has('x-campaign-id') ||
    headers.has('x-mailgun-sid') ||
    headers.has('x-sg-eid') ||
    headers.has('x-mktg-email')
  ) {
    return 'List-Unsubscribe or mailing list header present';
  }

  // 2. Precedence / Auto-Submitted headers
  const precedence = headers.get('precedence');
  if (typeof precedence === 'string' && /(bulk|junk|list)/i.test(precedence)) {
    return `Precedence header '${precedence}'`;
  }

  const autoSubmitted = headers.get('auto-submitted');
  if (typeof autoSubmitted === 'string' && autoSubmitted !== 'no') {
    return `Auto-Submitted header '${autoSubmitted}'`;
  }

  // 3. Sender address and From header text pattern matching
  const fromText = parsed.from?.text || '';
  if (AUTOMATED_SENDER_PATTERNS.test(senderAddress) || AUTOMATED_SENDER_PATTERNS.test(fromText)) {
    return `Automated/marketing pattern matched in sender '${senderAddress}'`;
  }

  // 4. Email body unsubscribe link check
  const bodyText = (parsed.text || '').toLowerCase();
  if (
    bodyText.includes('unsubscribe') &&
    (bodyText.includes('click here') ||
      bodyText.includes('manage preferences') ||
      bodyText.includes('email preferences') ||
      bodyText.includes('opt out') ||
      bodyText.includes('view in browser'))
  ) {
    return 'Unsubscribe link or marketing footer detected in email body';
  }

  return null;
};

/**
 * Tests an IMAP connection by connecting and logging out immediately.
 * Attaches an explicit error listener to prevent Node.js unhandled 'error' event crashes.
 * 
 * @param {Object} config 
 * @param {string} config.imapHost 
 * @param {number|string} config.imapPort 
 * @param {string} config.emailAddress 
 * @param {string} config.appPassword 
 * @returns {Promise<boolean>}
 */
export const testImapConnection = async ({ imapHost, imapPort, emailAddress, appPassword }) => {
  const port = parseInt(imapPort, 10) || 993;
  const client = new ImapFlow({
    host: imapHost,
    port,
    secure: port === 993,
    auth: {
      user: emailAddress,
      pass: appPassword
    },
    connectionTimeout: 15000,
    socketTimeout: 15000,
    logger: false
  });

  client.on('error', (err) => {
    process.stderr.write(`IMAP connection test error event for ${emailAddress}: ${err.message}\n`);
  });

  try {
    await client.connect();
    await client.logout().catch(() => {});
    return true;
  } catch (err) {
    await client.logout().catch(() => {});
    throw err;
  }
};

/**
 * Connects to a company's IMAP inbox, fetches unread emails received SINCE lastCheckedAt or firstConnectedAt,
 * parses them, creates contacts/conversations, generates AI replies, and sends replies via SMTP.
 * Marks all processed or skipped messages as \Seen to prevent duplicate processing.
 * 
 * @param {string} companyId 
 */
export const connectAndFetchNewEmails = async (companyId) => {
  try {
    const company = await Company.findById(companyId);
    if (!company || !company.emailConfig || !company.emailConfig.isConnected) {
      return;
    }

    const companyIdStr = companyId.toString();

    // Rate Limiting Safeguard: Max 20 auto-replies per hour per company
    if (!checkAutoReplyRateLimit(companyIdStr, 20)) {
      process.stderr.write(
        `Auto-reply rate limit hit for company ${companyIdStr} (exceeded 20 replies in the last hour) — possible misconfigured inbox, pausing email polling.\n`
      );
      return;
    }

    const { imapHost, imapPort, smtpHost, smtpPort, emailAddress, appPassword, lastCheckedAt, firstConnectedAt } = company.emailConfig;

    if (!imapHost || !emailAddress || !appPassword) {
      return;
    }

    const port = parseInt(imapPort, 10) || 993;
    const client = new ImapFlow({
      host: imapHost,
      port,
      secure: port === 993,
      auth: {
        user: emailAddress,
        pass: appPassword
      },
      connectionTimeout: 15000,
      socketTimeout: 15000,
      logger: false
    });

    client.on('error', (err) => {
      process.stderr.write(`IMAP connection error event for company ${companyIdStr}: ${err.message}\n`);
    });

    try {
      await client.connect();
    } catch (err) {
      process.stderr.write(`IMAP connection failure for company ${companyIdStr}: ${err.message}\n`);
      return;
    }

    let lock = null;

    try {
      lock = await client.getMailboxLock('INBOX');

      // Scope search: Only fetch unread messages received SINCE lastCheckedAt, or fallback to firstConnectedAt, or fallback to current time
      const sinceDate = lastCheckedAt || firstConnectedAt || new Date();
      const searchCriteria = {
        seen: false,
        since: new Date(sinceDate)
      };

      const messages = await client.search(searchCriteria);

      if (Array.isArray(messages) && messages.length > 0) {
        for await (const message of client.fetch(messages, { source: true, uid: true })) {
          try {
            const parsed = await simpleParser(message.source);
            
            const senderAddress = (parsed.from?.value?.[0]?.address || '').toLowerCase();

            if (!senderAddress) {
              // Mark invalid emails as seen to prevent reprocessing
              await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true }).catch(() => {});
              continue;
            }

            // Safety filter: Check if email is marketing, newsletter, system notification, or automated sender
            const bulkReason = getBulkOrAutomatedReason(parsed, senderAddress);
            if (bulkReason) {
              process.stdout.write(`Skipped automated/marketing email from ${senderAddress} (reason: ${bulkReason})\n`);
              // Explicitly mark as seen so it is never re-fetched or re-evaluated
              await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true }).catch(() => {});
              continue;
            }

            const senderName = parsed.from?.value?.[0]?.name || senderAddress;
            const subject = parsed.subject || '(No Subject)';
            const emailBody = parsed.text || parsed.textAsHtml || (typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, '') : '') || '(Empty Body)';
            const messageId = parsed.messageId;

            // Run tenant-scoped operations
            await runWithTenant(companyIdStr, async () => {
              // Validate plan channel gating
              const channelCheck = await checkChannelAllowed(companyIdStr, 'email');
              if (!channelCheck.allowed) {
                process.stderr.write(`Email channel blocked for company ${companyIdStr}: ${channelCheck.message}\n`);
                return;
              }

              // Find or create Contact matching sender's email address
              let contact = await Contact.findOne({ email: senderAddress, isDeleted: false });
              if (!contact) {
                contact = await Contact.create({
                  name: senderName,
                  email: senderAddress,
                  source: 'email',
                  leadStatus: 'new'
                });
              } else if (contact.name === 'Unknown' && senderName !== 'Unknown') {
                contact.name = senderName;
                await contact.save();
              }

              // Find or create active Conversation (channel: "email")
              let conversation = await Conversation.findOne({
                contactId: contact._id,
                channel: 'email',
                status: 'active'
              });

              if (!conversation) {
                const limitCheck = await checkLimit(companyIdStr, 'maxConversationsPerMonth');
                if (!limitCheck.allowed) {
                  process.stderr.write(`Conversation limit reached for company ${companyIdStr}: ${limitCheck.message}\n`);
                  return;
                }

                conversation = await Conversation.create({
                  visitorId: `email-${senderAddress}`,
                  channel: 'email',
                  status: 'active',
                  contactId: contact._id
                });
              }

              // Generate RAG AI reply (saves user and assistant messages)
              const replyText = await generateReply(companyIdStr, conversation._id, emailBody);

              // Send AI response back to sender via SMTP
              const replySubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
              await sendEmail({
                smtpHost,
                smtpPort,
                emailAddress,
                appPassword,
                to: senderAddress,
                subject: replySubject,
                text: replyText,
                inReplyTo: messageId,
                references: messageId
              });

              // Track auto-reply timestamp for hourly rate limiting safeguard
              recordAutoReply(companyIdStr);

              // Mark email as seen in IMAP inbox after successful reply
              await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
            });
          } catch (msgErr) {
            process.stderr.write(`Error processing single email message for company ${companyIdStr}: ${msgErr.message}. Marking as seen to prevent infinite reprocessing.\n`);
            // Explicitly mark message as seen even if error occurred during processing to prevent infinite retry loops
            await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true }).catch(() => {});
          }
        }
      }

      // Update lastCheckedAt after completing sweep
      company.emailConfig.lastCheckedAt = new Date();
      await company.save();
    } catch (err) {
      process.stderr.write(`IMAP fetch processing error for company ${companyIdStr}: ${err.message}\n`);
    } finally {
      if (lock) {
        try {
          lock.release();
        } catch (_) {}
      }
      await client.logout().catch(() => {});
    }
  } catch (topLevelErr) {
    process.stderr.write(`Unhandled IMAP worker error for company ${companyId}: ${topLevelErr.message}\n`);
  }
};

export default { testImapConnection, connectAndFetchNewEmails };
