import { CERTIFICATE_DEFAULTS, certificateDuration } from '../components/certificates/CertificateDesign.jsx';
import { gpMarkSvg } from '../components/certificates/gpMark.js';
import { corsSafeUrl } from './corsUrl.js';

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

/* What the rasterised images are drawn at. 300dpi is print resolution — past
   it a certificate gains file size and nothing a printer can render.

   It has to be pinned to the PRINTED size in millimetres rather than to the
   source image's own pixels, which are meaningless here: an SVG data URL
   reports whatever default box the browser gives it, and a signature scanned
   off a phone is several thousand pixels wide. Sizing off either put a
   multi-megabyte raster into a file whose whole point is that it is a few tens
   of kilobytes of vector text. */
const PRINT_DPI = 300;
const mmToPx = (mm) => Math.max(1, Math.round((mm / 25.4) * PRINT_DPI));

/* An image, as a PNG data URL and its natural proportions, ready for addImage.

   jsPDF takes rasters, not markup, so anything drawn here has to go through a
   canvas first. Both the logo and the signature scan come through this.
   `heightMm` is the height it will be PLACED at, which is what decides how many
   pixels are worth keeping.

   It resolves to null rather than throwing on anything that fails to load. A
   signature the browser can't fetch — an expired object URL, a bucket that
   moved — must not cost the learner their download; the certificate simply
   prints with the rule and the name, exactly as one with no scan uploaded. */
async function loadImage(src, { crossOrigin = false, heightMm = 10, tint = null } = {}) {
  try {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    // Its own cache entry for the CORS load — see utils/corsUrl.js.
    img.src = crossOrigin ? corsSafeUrl(src) : src;
    await img.decode();

    const ratio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    const canvas = document.createElement('canvas');
    canvas.height = mmToPx(heightMm);
    canvas.width = Math.max(1, Math.round(canvas.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    /* Recolour, keeping the shape. `source-in` paints the fill only where the
       image already has pixels, so a transparent signature comes out in the
       given colour and its transparency is untouched.

       The screen version does the same thing with a CSS mask. Both exist so a
       signature drawn in one fixed ink is never invisible on a certificate
       whose paper the instructor set to something dark. */
    if (tint) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    return { dataUrl: canvas.toDataURL('image/png'), ratio };
  } catch {
    // A signature hosted cross-origin without CORS taints the canvas, and
    // toDataURL throws. Same answer as a failed load: print without it.
    return null;
  }
}

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

  /* `compress` deflates the streams. It matters now that there are rasters on
     the page: uncompressed, the signature's alpha channel alone was most of a
     megabyte, on a document whose whole point is that it is small enough to
     attach to an application. */
  /* Where the signature block prints. Resolved up here because the FOOT LINE
     depends on it: centred, the signature, the name, the role, the date, the
     credential and the verify line all stack in one column, which is about
     8mm taller than the two-column arrangement the other placements use. */
  const position = ['left', 'center', 'right'].includes(d.signaturePosition)
    ? d.signaturePosition
    : 'left';
  const centredFoot = position === 'center';

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });

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
  const footY = PAGE.h - MARGIN - FRAME_INSET - (centredFoot ? 33 : 24);

  /* --- the masthead, at the top of the frame -------------------------------
     The GP monogram over the issuer's name, painted in the accent colour so it
     belongs to whatever palette the instructor chose — the same mark the
     on-screen certificate inlines, from the same path data.

     The issuer prints in TITLE CASE. It used to be upper-cased here and only
     here, so the file shouted GOVERNMENT PROCUREMENT while the page it was
     downloaded from said Government Procurement. The brand is written the
     second way, and the two renderers are supposed to agree. */
  const MASTHEAD_SIZE = 11;
  const MASTHEAD_SPACING = 0.9;
  const MARK_H = 8.5;

  const issuer = String(certificate?.issuerName || d.issuerName || '').trim();
  const mark = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(gpMarkSvg(`rgb(${accent.join(',')})`))}`,
    { heightMm: MARK_H },
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(MASTHEAD_SIZE);
  doc.setTextColor(...accent);

  // getTextWidth doesn't know about charSpace, which is applied between glyphs,
  // so the tracking is added back on to centre the lockup as one piece.
  const issuerW = issuer
    ? doc.getTextWidth(issuer) + MASTHEAD_SPACING * Math.max(0, issuer.length - 1)
    : 0;
  const markW = mark ? MARK_H * mark.ratio : 0;
  const lockupGap = mark && issuer ? 3.5 : 0;

  let x = centre - (markW + lockupGap + issuerW) / 2;
  if (mark) {
    // `doc.text` draws on the BASELINE, so the mark is hung above it by most of
    // its own height to sit level with the name beside it.
    doc.addImage(mark.dataUrl, 'PNG', x, y - MARK_H * 0.74, markW, MARK_H, 'gp-mark', 'FAST');
    x += markW + lockupGap;
  }
  if (issuer) doc.text(issuer, x, y, { charSpace: MASTHEAD_SPACING });

  // What `line` would have advanced by: one line of this size, plus the gap.
  // The gap is wider than the 7mm the stacked masthead used, because the mark
  // hangs below the baseline the text sits on — measured from the mark's foot
  // rather than the text's, 7mm put the heading almost against it.
  y += MASTHEAD_SIZE * PT * 1.3 + 11;

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

  /* Where the signature block prints, matching the on-screen document exactly —
     the two renderers read the same `signaturePosition` and place it the same
     way, so what an instructor arranges in the builder is what downloads.

     The RULE is 62mm long and the signature is written across it. Everything in
     the block hangs off `sigX`, its left end, so a change of side moves one
     number rather than six. The date and credential take the opposite end,
     because they are the only other thing down here and sharing a side leaves
     half the foot empty; centred, they go under the signature instead. */
  const SIG_RULE_W = 62;

  const sigX =
    position === 'right'
      ? footR - SIG_RULE_W
      : position === 'center'
        ? centre - SIG_RULE_W / 2
        : footL;
  // The signature's own text is centred on the rule when the block is, and
  // reads from the rule's left end otherwise.
  const sigTextX = position === 'center' ? centre : sigX;
  const sigAlign = position === 'center' ? 'center' : 'left';

  /* Loaded with crossOrigin set, because the file is served from the media
     bucket rather than this origin: without it the canvas is tainted and
     toDataURL throws. loadImage answers null in that case and the certificate
     prints with the rule and the name alone, which is what a certificate with
     no signature looks like. */
  const signatureSrc = certificate?.design?.signatureUrl || d.signatureUrl || d.signature?.url || '';
  if (signatureSrc) {
    // Bounded both ways: tall enough to read, never wider than the rule it is
    // written across. Measured before the load so the raster is built at the
    // size it will actually be placed at.
    const SIG_MAX_H = 16;
    const SIG_MAX_W = 52;
    // Same ink as the recipient's name, for the reason given in loadImage.
    const inkColour = `rgb(${text.join(',')})`;
    const probe = await loadImage(signatureSrc, {
      crossOrigin: true,
      heightMm: SIG_MAX_H,
      tint: inkColour,
    });
    if (probe) {
      const h = Math.min(SIG_MAX_H, SIG_MAX_W / probe.ratio);
      const sig = h === SIG_MAX_H
        ? probe
        : await loadImage(signatureSrc, { crossOrigin: true, heightMm: h, tint: inkColour });
      if (sig) {
        const w = h * sig.ratio;
        // Sitting ON the line, and centred over it when the block is centred.
        const imgX = position === 'center' ? centre - w / 2 : sigX;
        doc.addImage(sig.dataUrl, 'PNG', imgX, footY - h + 2.5, w, h, 'signature', 'FAST');
      }
    }
  }

  // The rule is drawn whether or not a name is set, exactly as on screen, so a
  // certificate with no named signatory still reads as a signed document.
  doc.setDrawColor(...muted);
  doc.setLineWidth(0.3);
  doc.line(sigX, footY, sigX + SIG_RULE_W, footY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...text);
  if (signatory) doc.text(String(signatory), sigTextX, footY + 6, { align: sigAlign });

  if (role) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(String(role), sigTextX, footY + 11, { align: sigAlign });
  }

  /* Issue date and credential ID, at whichever end the signature is not.
     Centred, they drop BELOW the signatory's role rather than sitting beside
     it — there is no free end left to take. */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...muted);

  const metaX = position === 'center' ? centre : position === 'right' ? footL : footR;
  const metaAlign = position === 'center' ? 'center' : position === 'right' ? 'left' : 'right';
  const metaY = centredFoot ? footY + 17 : footY + 6;

  const issued = formatDate(certificate?.issuedAt);
  if (issued) doc.text(`Issued ${issued}`, metaX, metaY, { align: metaAlign });

  if (d.showCredentialId && certificate?.credentialId) {
    doc.setFontSize(9);
    doc.text(String(certificate.credentialId), metaX, metaY + 5, { align: metaAlign });
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
      metaX,
      metaY + 10,
      { align: metaAlign },
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
