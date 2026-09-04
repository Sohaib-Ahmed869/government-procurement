import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---------------------------------------------------------------------------
   The house style for every email this app sends.

   One function builds all of them, so a change to the header, the button or the
   footer happens once rather than five times in five controllers — and so no
   email can quietly ship as bare text again.

   ---- Why this looks like 1999 HTML ----------------------------------------

   Because email clients are 1999 renderers. Outlook on Windows draws HTML with
   Microsoft Word's engine. So: tables for layout, inline styles on every
   element, no flexbox, no grid, no <style> selectors worth relying on, and
   widths in pixels. This is the boring, portable subset, not a preference.

   ---- Why the logo is attached rather than linked ---------------------------

   Gmail and Outlook block remote images by default, which would leave the
   header a blank green band for most first-time recipients. Attaching it and
   referencing it by Content-ID means it is already in the message and renders
   without anyone pressing "display images". The cost is ~13KB per email, which
   is a fair trade for the brand actually appearing.
   ------------------------------------------------------------------------ */

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LOGO_PATH = path.join(HERE, '..', 'assets', 'email', 'logo.png');
const LOGO_CID = 'gp-logo';

// The site's own tokens, copied rather than imported — the backend has no
// access to the stylesheet, and an email that silently loses its brand colour
// because a token moved is worse than two places to update on a rebrand.
const C = {
  green: '#0a3114',   // --gp-green-900. Header band and buttons.
  green800: '#0e3e1b',
  mint: '#7ee2a8',    // --gp-mint-300. The accent, used sparingly.
  ink: '#16211b',
  ink2: '#3c4a42',
  muted: '#67736b',
  page: '#f4f6f5',
  card: '#ffffff',
  rule: '#e0e8e3',
  soft: '#f0f4f1',
};

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* The attachment every rendered email needs. Exported so the mailer can add it
   without each caller having to remember. */
export function logoAttachment() {
  return [{ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID }];
}

/* Builds one email.

     heading     the <h1> inside the card
     intro       optional lead sentence
     paragraphs  body copy, one string per paragraph (already plain text)
     cta         { label, url } — rendered as a button
     ctaHint     the line above the raw-URL fallback
     bullets     optional list
     note        small print inside the card, e.g. "this link expires in 1 hour"
     preheader   the grey text an inbox shows next to the subject

   Returns { html, text } — the text part is generated from the same inputs so
   the two can never drift, which is what happens when they are written twice.
*/
export function renderEmail({
  heading,
  intro = '',
  paragraphs = [],
  cta = null,
  ctaHint = 'If the button does not work, copy this link into your browser:',
  bullets = [],
  note = '',
  preheader = '',
} = {}) {
  const body = paragraphs.filter(Boolean);

  const p = (t) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.ink2};">${t}</p>`;

  const button = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 22px;">
        <tr><td align="center" bgcolor="${C.green}" style="border-radius:8px;">
          <a href="${esc(cta.url)}"
             style="display:inline-block;padding:14px 30px;font-family:Helvetica,Arial,sans-serif;
                    font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${esc(cta.label)}
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;font-size:12.5px;line-height:1.5;color:${C.muted};">${esc(ctaHint)}</p>
      <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;">
        <a href="${esc(cta.url)}" style="color:${C.green800};">${esc(cta.url)}</a>
      </p>`
    : '';

  const list = bullets.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
         ${bullets
    .map(
      (b) => `<tr>
             <td valign="top" style="padding:0 10px 8px 0;font-size:15px;line-height:1.6;color:${C.mint};">&bull;</td>
             <td style="padding:0 0 8px;font-size:15px;line-height:1.6;color:${C.ink2};">${esc(b)}</td>
           </tr>`,
    )
    .join('')}
       </table>`
    : '';

  const noteBlock = note
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
              style="margin:8px 0 0;background:${C.soft};border-radius:8px;">
         <tr><td style="padding:13px 16px;font-size:13px;line-height:1.55;color:${C.muted};">${esc(note)}</td></tr>
       </table>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
  <!-- Shown beside the subject in an inbox list, then hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    ${esc(preheader || intro || heading)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.page};">
    <tr><td align="center" style="padding:28px 12px 40px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
             style="width:600px;max-width:100%;font-family:Helvetica,Arial,sans-serif;">

        <!-- Header band. The mark alone is just a monogram; the wordmark under
             it is what makes the lockup read as the brand, and it is live text
             so it survives an image being stripped. -->
        <tr>
          <td align="center" bgcolor="${C.green}"
              style="padding:24px 24px 20px;background:${C.green};border-radius:12px 12px 0 0;">
            <img src="cid:${LOGO_CID}" alt="Government Procurement" width="70"
                 style="display:block;border:0;width:70px;max-width:70px;height:auto;margin:0 auto 10px;">
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;
                        letter-spacing:0.16em;text-transform:uppercase;color:#ffffff;line-height:1.3;">
              Government Procurement
            </div>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td bgcolor="${C.card}"
              style="padding:34px 34px 30px;background:${C.card};border-left:1px solid ${C.rule};border-right:1px solid ${C.rule};">
            <h1 style="margin:0 0 14px;font-size:23px;line-height:1.25;font-weight:700;color:${C.ink};">
              ${esc(heading)}
            </h1>
            ${intro ? p(esc(intro)) : ''}
            ${body.map((t) => p(esc(t))).join('')}
            ${list}
            ${button}
            ${noteBlock}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="${C.card}"
              style="padding:20px 34px 26px;background:${C.card};border:1px solid ${C.rule};border-top:0;border-radius:0 0 12px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="border-top:1px solid ${C.rule};padding-top:16px;">
                <p style="margin:0 0 6px;font-size:12.5px;line-height:1.55;color:${C.muted};">
                  Government Procurement — training and advisory for Australian public sector buying.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.55;color:${C.muted};">
                  You received this because of activity on your Government Procurement account.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Built from the same inputs, so it cannot drift from the HTML.
  const text = [
    heading,
    '='.repeat(Math.min(heading.length, 60)),
    '',
    intro,
    ...body,
    ...(bullets.length ? ['', ...bullets.map((b) => `- ${b}`)] : []),
    ...(cta ? ['', `${cta.label}: ${cta.url}`] : []),
    ...(note ? ['', note] : []),
    '',
    '--',
    'Government Procurement — training and advisory for Australian public sector buying.',
  ]
    .filter((l) => l !== '' || true)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { html, text };
}
