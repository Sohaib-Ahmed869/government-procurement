import nodemailer from 'nodemailer';
import { env, mailConfigured } from '../config/env.js';

/* ---------------------------------------------------------------------------
   Outbound email.

   ---- Two things Hostinger in particular gets strict about ------------------

   1. THE FROM ADDRESS MUST BE THE MAILBOX YOU AUTHENTICATED AS. Hostinger
      rejects a send whose From is some other domain — the usual symptom is a
      553 or 550 "sender address rejected" long after everything looked
      configured. `senderFor()` below therefore falls back to SMTP_USER rather
      than to a made-up no-reply@, and `mailPreflight()` says so out loud when
      the two disagree.

   2. PORT DECIDES THE HANDSHAKE. 465 is implicit TLS (`secure: true`); 587 is
      plaintext-then-STARTTLS (`secure: false`). Setting the wrong one hangs
      until the socket times out rather than failing cleanly, which is why the
      timeouts below are not optional.
   ------------------------------------------------------------------------ */

// Ports that speak TLS from the first byte. Everything else is assumed to
// negotiate with STARTTLS.
const IMPLICIT_TLS_PORTS = [465];

/* Who the mail is from.

   MAIL_FROM wins when set, because a display name ("Government Procurement
   <admin@...>") is worth having. When it is not set we use the authenticated
   mailbox — never a placeholder, which is a guaranteed rejection. */
export function senderFor() {
  return env.mail.from || env.mail.user;
}

// The address inside a "Name <addr>" string, for comparing against SMTP_USER.
function addressOf(from) {
  const m = /<([^>]+)>/.exec(from || '');
  return (m ? m[1] : from || '').trim().toLowerCase();
}

let transporter = null;

function getTransport() {
  if (!mailConfigured) return null;
  if (!transporter) {
    const secure = IMPLICIT_TLS_PORTS.includes(env.mail.port);
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure,
      /* Refuse to continue unencrypted when there is a PASSWORD to protect.
         Without this nodemailer carries on in the clear if the server will not
         upgrade, and the mailbox password crosses the network in plaintext.

         Conditioned on auth rather than applied to every non-465 port, because
         the thing being protected is the credential. A local catcher — Mailpit,
         Mailhog, MailDev — takes no credentials and speaks no TLS, and there is
         nothing to leak; demanding STARTTLS there would only break development
         mail for no gain. */
      requireTLS: !secure && Boolean(env.mail.user),
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
      // A request should never be held open by a mail server that stopped
      // answering. These are the difference between a 3-second failure and a
      // 2-minute one.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

/* Confirms the credentials actually authenticate, without sending anything.

   Used by `npm run mail:check`. Deliberately not called at boot: an SMTP
   handshake on every deploy is a slow, flaky thing to put in the startup path,
   and the question "are these credentials right?" is asked at setup time. */
export async function verifyTransport() {
  const transport = getTransport();
  if (!transport) return { ok: false, reason: 'not-configured' };
  await transport.verify();
  return { ok: true };
}

/* Configuration problems we can see without touching the network. Returned as
   a list so the check script can print all of them at once rather than making
   somebody fix one, re-run, and find the next. */
export function mailPreflight() {
  const notes = [];
  if (!mailConfigured) return [{ level: 'error', text: 'SMTP_HOST is not set.' }];

  if (!env.mail.user) notes.push({ level: 'error', text: 'SMTP_USER is not set.' });
  if (!env.mail.pass) notes.push({ level: 'error', text: 'SMTP_PASS is not set.' });

  const from = addressOf(senderFor());
  const user = (env.mail.user || '').trim().toLowerCase();
  if (from && user && from !== user) {
    notes.push({
      level: 'warn',
      text:
        `MAIL_FROM sends as "${from}" but authenticates as "${user}". ` +
        'Most hosts — Hostinger included — reject that. Make them the same ' +
        'address, or make sure the From is a verified alias of the mailbox.',
    });
  }
  if (from.endsWith('example.com')) {
    notes.push({ level: 'error', text: `MAIL_FROM is still a placeholder (${from}).` });
  }
  if (!IMPLICIT_TLS_PORTS.includes(env.mail.port) && env.mail.port !== 587) {
    notes.push({
      level: 'warn',
      text: `Port ${env.mail.port} is unusual. 465 is SSL, 587 is STARTTLS.`,
    });
  }
  return notes;
}

/* Sends, or logs when SMTP is not configured.

   THROWS on a real failure. That is right for the callers where the email IS
   the deliverable — an admin pressing "send the answer" has to be told it did
   not go. For everything else, use sendMailSafe. */
export async function sendMail({ to, subject, html, text, replyTo }) {
  const transport = getTransport();
  if (!transport) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mail:console] SMTP not configured — would send:\n  to: ${to}\n  subject: ${subject}\n  ${text || html}\n`,
    );
    return { queued: false, logged: true };
  }
  const info = await transport.sendMail({ from: senderFor(), to, subject, html, text, replyTo });
  return { queued: true, messageId: info?.messageId };
}

/* Sends without ever throwing, and says whether it worked.

   For the sends that are a side effect of something else the user did. A
   notification that could not go out must not turn a successful signup, reply
   or subscription into a 500 — and in the case of a password reset it must not
   throw at all, because throwing only for addresses that exist is exactly how
   an attacker enumerates accounts. */
export async function sendMailSafe(message) {
  try {
    return await sendMail(message);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[mail] send failed to ${message?.to}: ${err?.message ?? err}`);
    return { queued: false, error: err?.message ?? String(err) };
  }
}
