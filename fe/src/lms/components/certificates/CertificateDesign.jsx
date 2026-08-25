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
};

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
        <p className="lms-certdoc__issuer">{issuerName || d.issuerName}</p>
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

        <div className="lms-certdoc__foot">
          <div className="lms-certdoc__sig">
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
