import { Company } from '../../models/Company.js';
import { connectAndFetchNewEmails } from './imapService.js';

/**
 * PRODUCTION NOTE:
 * This background polling task checks connected IMAP email inboxes every 2 minutes.
 * In a production environment at scale, polling is inefficient and should be upgraded to:
 * 1. IMAP IDLE persistent socket connections for real-time notification, or
 * 2. A push-based inbound parser service (e.g. SendGrid Inbound Parse, AWS SES, or Mailgun Webhooks).
 */
export const startEmailPoller = () => {
  const POLL_INTERVAL = 2 * 60 * 1000; // Every 2 minutes

  setInterval(async () => {
    try {
      // Find all active companies with connected email inbox settings
      const companies = await Company.find({
        isActive: true,
        'emailConfig.isConnected': true
      });

      for (const company of companies) {
        // Wrap each company check in its own try/catch to prevent single tenant failures from impacting others
        try {
          await connectAndFetchNewEmails(company._id);
        } catch (err) {
          process.stderr.write(`Email Poller error for company ${company._id}: ${err.message}\n`);
        }
      }
    } catch (err) {
      process.stderr.write(`Email background poller task error: ${err.message}\n`);
    }
  }, POLL_INTERVAL);

  process.stdout.write('Background email inbox poller task started (2-minute check frequency).\n');
};

export default startEmailPoller;
