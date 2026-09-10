import { GP_MARK_PATHS, GP_MARK_VIEWBOX } from './gpMark.js';
import { corsSafeUrl } from '../../utils/corsUrl.js';

// One renderer for a certificate, used by both the instructor's preview and the
// issued document a learner opens.
//
// It is deliberately the SAME component. A separate preview drifts from the
// real thing, and the moment it does, an instructor is designing something
// other than what gets issued.
//
// It takes a flat `design` plus the facts, and knows nothing about where either
// came from. The builder passes the course's current template; the certificate
// page passes the snapshot taken when it was earned.
export const CERTIFICATE_DEFAULTS = {
  enabled: true,
  heading: 'Certificate of Completion',
  preamble: 'This is to certify that',
  statement: 'has successfully completed',
  footnote: '',
  issuerName: 'Government Procurement',
  signatoryName: '',
  signatoryRole: '',
  accent: '#0a3114',
  background: '#ffffff',
  textColor: '#1a1a1a',
  showHours: true,
  showCredentialId: true,
  // The signatory's uploaded signature. A course template carries it as
  // `signature: { key, url }`; an ISSUED certificate carries the flat
  // `signatureUrl` it was stamped with. Both are read below, because this one
  // component renders both.
  signature: { key: '', url: '' },
  signatureUrl: '',
  // Where the signature block sits along the foot: left, center or right.
  signaturePosition: 'left',
};

// The GP monogram, set BESIDE the issuer's name rather than above it. Inline
// rather than an <img> so it takes the certificate's accent colour, and so it is
// part of the document when the page is printed rather than a separate request
// that may not have landed.
//
// Beside, because an A4 landscape certificate has very little height to spare:
// a long course title that wraps to two lines and a footnote underneath it
// already fill the paper. Stacked above the name the mark cost most of a line
// and pushed the body up into the heading; in a lockup it costs only the
// difference between its own height and the line it shares.
function GpMark() {
  return (
    <svg
      className="lms-certdoc__mark"
      viewBox={GP_MARK_VIEWBOX}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {GP_MARK_PATHS.map((d) => <path key={d.slice(0, 24)} d={d} />)}
    </svg>
  );
}

/* The signature, recoloured to the certificate's own ink.

   It is drawn in one fixed colour the signatory never chose, so there is no
   colour intent to preserve — and an instructor may set any paper colour they
   like. Dark ink on a dark certificate is simply invisible.

   Done with a CSS MASK: the signature file becomes the shape, and the
   certificate's text colour is painted through it. The element is a coloured
   box that only shows where the file has pixels.

   This replaces a canvas that read the image back with `toDataURL` and refilled
   it with `source-in`. When that read threw, the code fell back to the file as
   uploaded and the signature came out navy on dark green.

   A mask is still a CORS request, though: browsers fetch a cross-origin
   mask-image in CORS mode, exactly as they do an <img crossorigin>. The URL
   goes through `corsSafeUrl` so the mask gets its own cache entry — otherwise
   the builder's plain <img> preview of the same file leaves a copy without the
   CORS header in the cache, and the mask is blocked on it. See utils/corsUrl.js.

   `maskSupported` is checked once rather than per render. Everything current
   supports it, prefixed or not; anything that does not falls back to the file
   as uploaded, which is what the whole document did before any of this. */
const maskSupported =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports('mask-image', 'url("a.png")') ||
      CSS.supports('-webkit-mask-image', 'url("a.png")')
    : false;

// Secondary text (the "this is to certify that" lines, the date, the role) is
// derived from the body colour rather than being a fourth thing to choose.
// colour-mix keeps it legible against any background: on dark paper it lightens
// toward the text colour, on light paper it fades toward it.
const muted = (text) => `color-mix(in srgb, ${text} 68%, transparent)`;

/* The taught-time line, worded from minutes.
   It used to read `hours` alone, which the server had already rounded to a
   whole number — so a 40-minute course said "0 hours of learning", and because
   0 is falsy the line vanished from the document altogether. Minutes are the
   record now; whole hours stay as the fallback for certificates issued before
   that, and a half-hour reads as a half-hour instead of disappearing. */
export function certificateDuration({ minutes, hours }) {
  const mins = Number.isFinite(minutes) ? minutes : (hours || 0) * 60;
  if (mins <= 0) return '';
  if (mins < 60) return `${Math.round(mins)} ${Math.round(mins) === 1 ? 'minute' : 'minutes'} of learning`;
  // One decimal, and never a trailing ".0": "1.5 hours", "2 hours".
  const h = Math.round((mins / 60) * 10) / 10;
  return `${h} ${h === 1 ? 'hour' : 'hours'} of learning`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function CertificateDesign({
  design,
  recipientName,
  courseTitle,
  hours,
  minutes,
  credentialId,
  issuedAt,
  issuerName,
  signatoryName,
  signatoryRole,
}) {
  const d = { ...CERTIFICATE_DEFAULTS, ...(design ?? {}) };
  const durationLine = d.showHours ? certificateDuration({ minutes, hours }) : '';
  // A template being previewed carries the uploaded object; an issued
  // certificate carries the URL snapshotted at the moment it was earned.
  const signatureImage = d.signatureUrl || d.signature?.url || '';
  const signaturePosition = ['left', 'center', 'right'].includes(d.signaturePosition)
    ? d.signaturePosition
    : 'left';


  return (
    <article
      className="lms-certdoc"
      // Author-chosen colours drive CSS variables rather than being written
      // into a dozen inline styles.
      style={{
        '--cert-accent': d.accent || CERTIFICATE_DEFAULTS.accent,
        '--cert-bg': d.background || CERTIFICATE_DEFAULTS.background,
        '--cert-text': d.textColor || CERTIFICATE_DEFAULTS.textColor,
        '--cert-muted': muted(d.textColor || CERTIFICATE_DEFAULTS.textColor),
      }}
    >
      <div className="lms-certdoc__frame">
        {/* Title case, as the brand is written. It used to print in the PDF as
            GOVERNMENT PROCUREMENT — the screen and the file disagreed, and the
            shout was never the mark. */}
        <div className="lms-certdoc__masthead">
          <GpMark />
          <p className="lms-certdoc__issuer">{issuerName || d.issuerName}</p>
        </div>
        <h2 className="lms-certdoc__heading">{d.heading}</h2>

        {/* The body is its own block so it can sit CENTRED in the space between
            the heading and the signature line. Left in the normal flow it
            stacked under the heading and the foot pinned itself to the bottom,
            which on a short certificate left a hand's width of empty paper
            between the course title and the signature. */}
        <div className="lms-certdoc__body">
          <p className="lms-certdoc__preamble">{d.preamble}</p>
          <p className="lms-certdoc__name">{recipientName || 'Recipient name'}</p>
          <p className="lms-certdoc__statement">{d.statement}</p>
          <p className="lms-certdoc__course">{courseTitle || 'Course title'}</p>

          {durationLine ? <p className="lms-certdoc__hours">{durationLine}</p> : null}

          {d.footnote ? <p className="lms-certdoc__footnote">{d.footnote}</p> : null}
        </div>

        {/* The foot's arrangement follows where the signature is meant to
            print. The issue date and credential always take the opposite end
            from the signature — they are the two things down here, and putting
            them on the same side leaves half the foot empty. With the signature
            centred they sit under it, on their own line. */}
        <div className={`lms-certdoc__foot is-sig-${signaturePosition}`}>
          <div className="lms-certdoc__sig">
            {/* The signature scan, sitting ON the rule the way a signed document
                does. The box holds its height whether or not an image is set, so
                adding one doesn't shove the foot up the page. */}
            {/* The signature, painted in the certificate's own text colour
                through a mask of the uploaded file. See the note above. */}
            <span className="lms-certdoc__sig-mark">
              {!signatureImage ? null : maskSupported ? (
                <span
                  className="lms-certdoc__sig-ink"
                  style={{ '--cert-sig': `url("${corsSafeUrl(signatureImage)}")` }}
                  role="img"
                  aria-label=""
                />
              ) : (
                <img src={signatureImage} alt="" />
              )}
            </span>
            {/* The rule sits above the name whether or not one is set, so the
                layout doesn't jump as the instructor types. */}
            <span className="lms-certdoc__rule" />
            <span className="lms-certdoc__sig-name">{signatoryName || d.signatoryName || ' '}</span>
            <span className="lms-certdoc__sig-role">{signatoryRole || d.signatoryRole || ' '}</span>
          </div>
          <div className="lms-certdoc__meta">
            {issuedAt ? <span>Issued {formatDate(issuedAt)}</span> : null}
            {d.showCredentialId && credentialId ? (
              <span className="lms-certdoc__credential">{credentialId}</span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
