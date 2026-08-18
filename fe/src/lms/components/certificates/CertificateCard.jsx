import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';

function issuedOn(iso) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

// An earned certificate in the list (L4).
export default function CertificateCard({ certificate }) {
  const t = certificate.template;

  return (
    <article className="lms-certcard">
      <Link
        to={`/learn/certificates/${certificate.id}`}
        className="lms-certcard__thumb"
        style={{ '--cert-accent': t.accent, '--cert-accent-soft': t.accentSoft }}
        aria-label={certificate.title}
      >
        <LmsIcon name={t.seal} />
      </Link>

      <div className="lms-certcard__body">
        <span className="lms-certcard__kind">
          {certificate.kind === 'path' ? 'Program certificate' : 'Course certificate'}
        </span>
        <h3 className="lms-certcard__title">
          <Link to={`/learn/certificates/${certificate.id}`}>{certificate.title}</Link>
        </h3>
        <p className="lms-certcard__meta">
          Issued {issuedOn(certificate.issuedAt)}
          {certificate.hours ? ` · ${certificate.hours} hours` : ''}
        </p>
        <p className="lms-certcard__id">{certificate.credentialId}</p>
      </div>

      <div className="lms-certcard__foot">
        <Link className="lms-btn lms-btn--sm lms-btn--primary" to={`/learn/certificates/${certificate.id}`}>
          View
        </Link>
      </div>
    </article>
  );
}
