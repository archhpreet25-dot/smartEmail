
const nodemailer = require('nodemailer');

// Real SMTP when credentials exist, otherwise a local JSON transport
// so the whole flow still works offline.
const configured = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : nodemailer.createTransport({ jsonTransport: true });

const fromAddress =
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  'no-reply@smartmail.local';

module.exports = { transporter, configured, fromAddress };
