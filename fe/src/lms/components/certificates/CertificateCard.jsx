import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import CertificateDownload from './CertificateDownload.jsx';

function issuedOn(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  });
}

// An earned certificate in the list (L4).
//
// Reads the record the API actually returns: a Mongo `_id` and the `design`
// snapshot taken when the certificate was earned. It used to read `id` and
// `template`, which is the shape the old placeholder had — so `template.accent`
// threw the moment this page met a real certificate and took the whole
// Certificates tab down with it.
export default function CertificateCard({ certificate }) {
  const id = certificate._id ?? certificate.id;
  const design = certificate.design ?? {};
  // Every field is optional here on purpose: a certificate issued before a
  // design field existed still has to render.
  const accent = design.accent || '#0a3114';
  const href = `/learn/certificates/${id}`;

  return (
    <article className="lms-certcard">
      <Link
        to={href}
        className="lms-certcard__thumb"
        style={{ '--cert-accent': accent }}
        aria-label={certificate.title}
      >
        <LmsIcon name="award" />
      </Link>

      <div className="lms-certcard__body">
        <span className="lms-certcard__kind">
          {certificate.kind === 'path' ? 'Program certificate' : 'Course certificate'}
        </span>
        <h3 className="lms-certcard__title">
          <Link to={href}>{certificate.title}</Link>
        </h3>
        <p className="lms-certcard__meta">
          Issued {issuedOn(certificate.issuedAt)}
          {certificate.hours ? ` · ${certificate.hours} hours` : ''}
        </p>
        <p className="lms-certcard__id">{certificate.credentialId}</p>
      </div>

      <div className="lms-certcard__foot">
        <Link className="lms-btn lms-btn--sm lms-btn--primary" to={href}>
          View
        </Link>
        {/* Straight from the list: the common errand here is "send someone my
            certificate", and making that a detour through the detail page is a
            click for nothing. */}
        <CertificateDownload certificate={certificate} className="lms-btn lms-btn--sm" />
      </div>
    </article>
  );
}
