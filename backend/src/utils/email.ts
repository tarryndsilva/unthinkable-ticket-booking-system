import nodemailer from 'nodemailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string, attachments?: nodemailer.SendMailOptions['attachments']) {
  // In test/dev without SMTP configured, skip actually sending and just log.
  if (!config.smtp.host || process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line no-console
    console.log(`[email:skip] to=${to} subject="${subject}"`);
    return { skipped: true };
  }
  const info = await getTransporter().sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
    attachments,
  });
  return info;
}
