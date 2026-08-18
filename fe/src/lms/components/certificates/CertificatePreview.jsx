import LmsIcon from '../LmsIcon.jsx';

function issuedOn(iso) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

// The certificate itself (L4).
//
// "Fully customisable" is carried by `certificate.template`: accent colours,
// orientation, seal, body wording, signatory and issuer are all data. Nothing
// visual is hardcoded here, so the instructor-facing designer (R1) edits a
// record and this renders it, rather than needing a component change per
// template.
//
// Rendered as live DOM rather than an image so it stays selectable, printable
// at any size and readable to a screen reader.
export default function CertificatePreview({ certificate, recipient }) {
  const t = certificate.template;

  return (
    <div
      className={`lms-cert is-${t.orientation}`}
      style={{ '--cert-accent': t.accent, '--cert-accent-soft': t.accentSoft }}
    >
      <div className="lms-cert__inner">
        <div className="lms-cert__head">
          <span className="lms-cert__issuer">{t.issuer}</span>
          <span className="lms-cert__kind">
            {certificate.kind === 'path' ? 'Certificate of Program' : 'Certificate of Completion'}
          </span>
        </div>

        <p className="lms-cert__intro">This is to certify that</p>
        <p className="lms-cert__name">{recipient}</p>
        <p className="lms-cert__body">{t.bodyCopy}</p>
        <p className="lms-cert__course">{certificate.title}</p>

        {t.showHours && certificate.hours ? (
          <p className="lms-cert__hours">{certificate.hours} hours of continuing education</p>
        ) : null}

        <div className="lms-cert__foot">
          <div className="lms-cert__sig">
            <span className="lms-cert__sig-name">{t.signatory.name}</span>
            <span className="lms-cert__sig-role">{t.signatory.role}</span>
          </div>

          <div className="lms-cert__seal" aria-hidden="true">
            <LmsIcon name={t.seal} />
          </div>

          <div className="lms-cert__sig is-right">
            <span className="lms-cert__sig-name">{issuedOn(certificate.issuedAt)}</span>
            <span className="lms-cert__sig-role">Date issued</span>
          </div>
        </div>

        <p className="lms-cert__id">
          Credential ID {certificate.credentialId} · verify at
          {' '}government-procurement.com.au/verify/{certificate.credentialId}
        </p>
      </div>
    </div>
  );
}
