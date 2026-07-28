import nodemailer from 'nodemailer';

/**
 * Validates an SMTP connection using Nodemailer's verify method.
 * 
 * @param {Object} config 
 * @param {string} config.smtpHost 
 * @param {number|string} config.smtpPort 
 * @param {string} config.emailAddress 
 * @param {string} config.appPassword 
 * @returns {Promise<boolean>}
 */
export const testSmtpConnection = async ({ smtpHost, smtpPort, emailAddress, appPassword }) => {
  const port = parseInt(smtpPort, 10) || 587;
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    auth: {
      user: emailAddress,
      pass: appPassword
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  await transporter.verify();
  return true;
};

/**
 * Sends an email using Nodemailer.
 * Falls back to environment variables if company-specific credentials are not passed.
 * 
 * @param {Object} options 
 * @param {string} [options.smtpHost]
 * @param {number|string} [options.smtpPort]
 * @param {string} [options.emailAddress]
 * @param {string} [options.appPassword]
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} [options.inReplyTo]
 * @param {string} [options.references]
 */
export const sendEmail = async ({
  smtpHost,
  smtpPort,
  emailAddress,
  appPassword,
  to,
  subject,
  text,
  inReplyTo,
  references
}) => {
  const host = smtpHost || process.env.SMTP_HOST;
  const port = parseInt(smtpPort || process.env.SMTP_PORT, 10) || 587;
  const user = emailAddress || process.env.SMTP_USER;
  const pass = appPassword || process.env.SMTP_PASS;
  const from = emailAddress || process.env.SMTP_FROM || 'no-reply@bolo-ai.com';

  if (!host || !user || !pass) {
    throw new Error('SMTP configurations (host, emailAddress, appPassword) are missing.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  const mailOptions = {
    from,
    to,
    subject,
    text
  };

  if (inReplyTo) {
    mailOptions.inReplyTo = inReplyTo;
  }
  if (references) {
    mailOptions.references = references;
  }

  return await transporter.sendMail(mailOptions);
};

export default { testSmtpConnection, sendEmail };
