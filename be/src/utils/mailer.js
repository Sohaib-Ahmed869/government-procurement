import nodemailer from 'nodemailer';
import { env, mailConfigured } from '../config/env.js';

// Lazily-created transport. When SMTP isn't configured we fall back to logging
// the email to the console, so the whole app works before mail creds are added.
let transporter = null;

function getTransport() {
  if (!mailConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const transport = getTransport();
  if (!transport) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mail:console] SMTP not configured — would send:\n  to: ${to}\n  subject: ${subject}\n  ${text || html}\n`,
    );
    return { queued: false, logged: true };
  }
  await transport.sendMail({ from: env.mail.from, to, subject, html, text });
  return { queued: true };
}
