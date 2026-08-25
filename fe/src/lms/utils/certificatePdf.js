import { CERTIFICATE_DEFAULTS, certificateDuration } from '../components/certificates/CertificateDesign.jsx';

/* ---------------------------------------------------------------------------
   The certificate, as a real PDF (LMS 12.0b).

   DRAWN, not screenshotted. The obvious route — html2canvas into jsPDF — turns
   the document into a bitmap: the recipient's name stops being text, it cannot
   be searched, copied or read aloud, it prints soft at any size a certificate
   is actually printed at, and a one-page award becomes megabytes. This writes
   each line as vector text, so the file is a few tens of kilobytes, sharp on
   paper, and the credential ID can be selected and pasted into /verify. Same
   reasoning as features/articles/pdf.js, which is where the pattern comes from.

   It reads the SAME `design` snapshot the on-screen certificate does, so the
   two cannot drift: whatever the learner was shown is what downloads.

   jsPDF is imported dynamically, so nobody who never presses Download pays for
   it in the bundle.
   ------------------------------------------------------------------------ */

// A4 landscape, in mm.
const PAGE = { w: 297, h: 210 };
// Room for the frame to sit inside the paper without touching a printer's
// unprintable edge.
const MARGIN = 12;
const FRAME_INSET = 6;

// pt -> mm. jsPDF measures type in points whatever the document unit is.
const PT = 0.3528;

function hexToRgb(hex, fallback = [10, 49, 20]) {
  const m = /^#?([a-f\d]{3}|[a-f\d]{6})$/i.exec(String(hex ?? '').trim());
  if (!m) return fallback;
  const raw = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
}

// The muted tone the CSS gets from colour-mix: the body colour at 68% over the
// page background. Computed rather than guessed so a dark certificate stays
// legible instead of printing near-black text on near-black paper.
const mix = (fg, bg, amount) => fg.map((c, i) => Math.round(c * amount + bg[i] * (1 - amount)));

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Something findable in a downloads folder six months later: the award, then
// the credential ID that makes it unique.
function fileName(certificate) {
  const slug = String(certificate?.title || 'certificate')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const id = certificate?.credentialId ? `-${certificate.credentialId}` : '';
  return `${slug || 'certificate'}${id}.pdf`;
}

export async function downloadCertificatePdf(certificate) {
  const { jsPDF } = await import('jspdf');

  const d = { ...CERTIFICATE_DEFAULTS, ...(certificate?.design ?? {}) };
  const accent = hexToRgb(d.accent, hexToRgb(CERTIFICATE_DEFAULTS.accent));
  const bg = hexToRgb(d.background, [255, 255, 255]);
  const text = hexToRgb(d.textColor, [26, 26, 26]);
  const muted = mix(text, bg, 0.68);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  // The paper itself. Drawn rather than left white, because the design may set
  // a background and a PDF has no "page colour" to inherit.
  doc.setFillColor(...bg);
  doc.rect(0, 0, PAGE.w, PAGE.h, 'F');

  // The accent frame, matching the 2px rule the on-screen document carries.
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.7);
  doc.rect(
    MARGIN + FRAME_INSET,
    MARGIN + FRAME_INSET,
    PAGE.w - (MARGIN + FRAME_INSET) * 2,
    PAGE.h - (MARGIN + FRAME_INSET) * 2,
  );

  const CONTENT_W = PAGE.w - (MARGIN + FRAME_INSET) * 2 - 24;
  const centre = PAGE.w / 2;

  /* Centred lines, top-down, advancing a running y so no call site has to do
     pt-to-mm arithmetic. Long values wrap rather than running off the paper — a
     course title can be 60 characters and a recipient's name is not always
     short.

     `dry` draws nothing and only advances y. That is what lets the body block be
     measured before it is placed, which is what centres it (see below). */
  const FRAME_TOP = MARGIN + FRAME_INSET;
  let y = FRAME_TOP + 22;
  let dry = false;

  const line = (
    value,
    { size, style = 'normal', colour = text, gapBefore = 0, gapAfter = 0, spacing = 0, maxWidth = CONTENT_W },
  ) => {
    const value_ = String(value ?? '').trim();
    if (!value_) return;

    y += gapBefore;
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);

    // charSpace is in the document unit, so the tracked, upper-case lines match
    // the letter-spacing the CSS gives them.
    const opts = spacing ? { charSpace: spacing } : undefined;
    const lines = doc.splitTextToSize(value_, maxWidth);
    const lineH = size * PT * 1.3;

    lines.forEach((l) => {
      if (!dry) doc.text(l, centre, y, { align: 'center', ...(opts ?? {}) });
      y += lineH;
    });
    y += gapAfter;
  };

  /* --- the foot ------------------------------------------------------------
     Pinned to the bottom of the frame rather than following the flow above it.
     A certificate with no footnote and a short title would otherwise float its
     signature into the middle of the page.

     Computed here, before the body, because the body needs to know where the
     space it has to fill ends. */
  const footY = PAGE.h - MARGIN - FRAME_INSET - 24;

  // --- the masthead, at the top of the frame -------------------------------
  line((certificate?.issuerName || d.issuerName || '').toUpperCase(), {
    size: 11,
    style: 'bold',
    colour: accent,
    spacing: 0.9,
    gapAfter: 7,
  });

  line(d.heading, { size: 30, style: 'bold' });

  /* --- the body, CENTRED in what the masthead and the foot leave it --------
     Drawn in flow, it stacked straight under the heading while the foot stayed
     pinned to the bottom, so a short certificate printed with a band of empty
     paper between the course title and the signature — the gap the screen
     version had too. Measuring the block first and then placing it puts that
     space evenly above and below instead. */
  const bodyTop = y + 6;
  const bodyBottom = footY - 14;

  const drawBody = () => {
    line(d.preamble, { size: 12, colour: muted, gapAfter: 4 });
    line(certificate?.recipientName || 'Recipient name', { size: 26, style: 'bold', gapAfter: 6 });
    line(d.statement, { size: 12, colour: muted, gapAfter: 4 });
    line(certificate?.title || 'Course title', { size: 19, style: 'bold', colour: accent, gapAfter: 5 });

    if (d.showHours) {
      // Same wording the on-screen certificate uses, from the same function, so
      // the file and the page cannot disagree about how long the course was.
      line(certificateDuration(certificate ?? {}), { size: 11, colour: muted, gapAfter: 3 });
    }

    if (d.footnote) {
      line(d.footnote, { size: 10, colour: muted, gapBefore: 2, maxWidth: CONTENT_W - 30 });
    }
  };

  dry = true;
  y = bodyTop;
  drawBody();
  const bodyHeight = y - bodyTop;
  dry = false;

  // Never negative: an unusually tall body starts at bodyTop and simply runs on.
  y = bodyTop + Math.max(0, (bodyBottom - bodyTop - bodyHeight) / 2);
  drawBody();

  const footL = MARGIN + FRAME_INSET + 14;
  const footR = PAGE.w - MARGIN - FRAME_INSET - 14;

  const signatory = certificate?.signatoryName || d.signatoryName;
  const role = certificate?.signatoryRole || d.signatoryRole;

  // The rule is drawn whether or not a name is set, exactly as on screen, so a
  // certificate with no named signatory still reads as a signed document.
  doc.setDrawColor(...muted);
  doc.setLineWidth(0.3);
  doc.line(footL, footY, footL + 62, footY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...text);
  if (signatory) doc.text(String(signatory), footL, footY + 6);

  if (role) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(String(role), footL, footY + 11);
  }

  // Issue date and credential ID, right-aligned against the frame.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...muted);

  const issued = formatDate(certificate?.issuedAt);
  if (issued) doc.text(`Issued ${issued}`, footR, footY + 6, { align: 'right' });

  if (d.showCredentialId && certificate?.credentialId) {
    doc.setFontSize(9);
    doc.text(String(certificate.credentialId), footR, footY + 11, { align: 'right' });
    /* Where to check it. A certificate that names its own verification address
       is one an employer can act on without being told how.

       The host is read from wherever the file was generated, so this follows the
       deployment rather than being pinned to one domain — it says localhost on a
       dev machine and the live host in production, with nothing to change at
       go-live. The scheme is dropped because it is noise on a printed page and
       the address is meant to be typed, not clicked. */
    doc.setFontSize(7.5);
    doc.text(
      `Verify at ${window.location.host}/verify/${certificate.credentialId}`,
      footR,
      footY + 16,
      { align: 'right' },
    );
  }

  // PDF metadata, so the file identifies itself in a viewer's properties panel
  // and in search results on a desktop.
  doc.setProperties({
    title: `${d.heading} — ${certificate?.title ?? ''}`.trim(),
    subject: certificate?.credentialId ? `Credential ${certificate.credentialId}` : 'Certificate',
    author: certificate?.issuerName || d.issuerName || 'Government Procurement',
    creator: 'Government Procurement LMS',
  });

  doc.save(fileName(certificate));
}
