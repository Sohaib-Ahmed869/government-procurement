import { env, mailConfigured } from '../config/env.js';
import { verifyTransport, mailPreflight, senderFor, sendMail } from '../utils/mailer.js';

/* ---------------------------------------------------------------------------
   Checks the SMTP credentials end to end.

     npm run mail:check                    settings, then authenticate
     npm run mail:check -- you@domain.com  also send a real test email

   Same reasoning as zoom:check — /health should not open an SMTP connection on
   every probe, and "are these credentials right?" is a question asked at setup
   time, not continuously.
   ------------------------------------------------------------------------ */

const ok = (m) => console.log(`  ok      ${m}`);
const bad = (m) => console.log(`  FAILED  ${m}`);
const warn = (m) => console.log(`  warn    ${m}`);

const to = process.argv.slice(2).find((a) => a.includes('@'));

console.log('\nOutbound email — SMTP\n');

if (!mailConfigured) {
  bad('SMTP_HOST is not set, so nothing can be sent.');
  console.log(
    '\n  Nothing is broken — the app falls back to logging each email to the\n' +
      '  console. To send for real, fill these into be/.env:\n\n' +
      '    SMTP_HOST=smtp.hostinger.com\n' +
      '    SMTP_PORT=465\n' +
      '    SMTP_USER=you@yourdomain.com.au\n' +
      '    SMTP_PASS=the mailbox password\n' +
      '    MAIL_FROM=Government Procurement <you@yourdomain.com.au>\n\n' +
      '  Port 465 is SSL. If that is blocked, use 587 and the app switches to\n' +
      '  STARTTLS on its own.\n\n' +
      '  Then restart the API — .env is read once at boot.\n',
  );
  process.exit(1);
}

console.log(`  host    ${env.mail.host}:${env.mail.port}`);
console.log(`  mode    ${env.mail.port === 465 ? 'SSL (implicit TLS)' : 'STARTTLS (required)'}`);
console.log(`  user    ${env.mail.user || '(none)'}`);
console.log(`  pass    ${env.mail.pass ? `set, ${env.mail.pass.length} characters` : '(none)'}`);
console.log(`  from    ${senderFor()}\n`);

const notes = mailPreflight();
let fatal = false;
for (const n of notes) {
  if (n.level === 'error') { bad(n.text); fatal = true; } else { warn(n.text); }
}
if (!notes.length) ok('settings look consistent');
if (fatal) {
  console.log('\n  Fix the above, then run this again.\n');
  process.exit(1);
}

try {
  await verifyTransport();
  ok('the server accepted these credentials');
} catch (err) {
  bad(`the server rejected the connection: ${err?.message ?? err}`);
  const m = String(err?.message ?? '');
  // The three failures that account for almost every case, named plainly.
  if (/invalid login|authentication fail|535/i.test(m)) {
    console.log(
      '\n  That is an authentication failure, so host and port are right and the\n' +
        '  username or password is not. SMTP_USER is the FULL email address, and\n' +
        '  SMTP_PASS is the mailbox password — not your Hostinger account password.\n' +
        '  Reset it under Emails > your mailbox if you are unsure.\n',
    );
  } else if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(m)) {
    console.log(
      `\n  Nothing answered on port ${env.mail.port}. Either the port is blocked\n` +
        '  outbound from this machine, or the wrong one is set: 465 for SSL,\n' +
        '  587 for STARTTLS. Try the other one.\n',
    );
  } else if (/self.signed|certificate/i.test(m)) {
    console.log(
      '\n  A TLS certificate problem. Check SMTP_HOST is exactly the host your\n' +
        '  provider gave you — a certificate will not match an IP or an alias.\n',
    );
  }
  process.exit(1);
}

if (!to) {
  console.log('\n  Credentials work. To send a real test email:\n');
  console.log('    npm run mail:check -- you@yourdomain.com.au\n');
  process.exit(0);
}

try {
  const res = await sendMail({
    to,
    subject: 'Government Procurement — SMTP test',
    text:
      'This is a test from the Government Procurement API.\n\n' +
      `Sent via ${env.mail.host}:${env.mail.port} as ${senderFor()}.\n` +
      'If you are reading this, outbound email is working.',
    html:
      '<p>This is a test from the Government Procurement API.</p>' +
      `<p>Sent via <code>${env.mail.host}:${env.mail.port}</code> as <code>${senderFor()}</code>.</p>` +
      '<p>If you are reading this, outbound email is working.</p>',
  });
  ok(`sent to ${to}${res.messageId ? ` (${res.messageId})` : ''}`);
  console.log(
    '\n  Check the inbox, and the spam folder. A first send from a new domain\n' +
      '  often lands in spam until SPF and DKIM are published in DNS.\n',
  );
} catch (err) {
  bad(`accepted the login but refused the send: ${err?.message ?? err}`);
  if (/sender|from|553|550/i.test(String(err?.message ?? ''))) {
    console.log(
      '\n  That is the From address being rejected. Most hosts only let a mailbox\n' +
        `  send as itself: make MAIL_FROM use ${env.mail.user}, or add the address\n` +
        '  you want as a verified alias of that mailbox.\n',
    );
  }
  process.exit(1);
}
