import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import CertificateDesign from '../../components/certificates/CertificateDesign.jsx';
import { useCertificate } from '../../hooks/useCertificates.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';

// One certificate, full size (L4), with download, print and a shareable
// verification link.
export default function CertificateViewPage() {
  const { id } = useParams();
  const { certificate, status } = useCertificate(id);
  const { user } = useStudentAuth();
  const [copied, setCopied] = useState(false);

  // Printing is the download: the browser's own "Save as PDF" produces a proper
  // vector PDF at any paper size, and the print stylesheet isolates the
  // certificate from the rest of the page. That beats rasterising it to an
  // image, and needs no PDF dependency.
  const print = useCallback(() => window.print(), []);

  const copyLink = useCallback(async () => {
    if (!certificate) return;
    const url = `${window.location.origin}/verify/${certificate.credentialId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked. The ID is printed on the certificate anyway */
    }
  }, [certificate]);

  if (status === 'loading') {
    return (
      <div className="lms-card">
        <span className="lms-skel lms-skel--line" style={{ width: '44%', height: 22 }} />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Certificate not found</h1>
            <p className="lms-page__subtitle">That certificate doesn’t exist or isn’t yours.</p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/certificates">
          All certificates
        </Link>
      </div>
    );
  }

  // Signed out there is no name to print, so it says so rather than rendering a
  // certificate made out to nobody.
  const recipient = user?.name ?? 'Your name';

  return (
    <div>
      <div className="lms-page__head lms-noprint">
        <div>
          <h1 className="lms-page__title">{certificate.title}</h1>
          <p className="lms-page__subtitle">
            Credential {certificate.credentialId}
          </p>
        </div>
        <div className="lms-page__actions">
          <button type="button" className="lms-btn" onClick={copyLink}>
            <LmsIcon name={copied ? 'check' : 'link'} />
            {copied ? 'Link copied' : 'Copy verify link'}
          </button>
          <button type="button" className="lms-btn lms-btn--primary" onClick={print}>
            <LmsIcon name="download" />
            Download / print
          </button>
        </div>
      </div>

      {!user ? (
        <div className="lms-card lms-noprint" style={{ marginBottom: 18 }}>
          <p className="lms-empty" style={{ padding: '6px 0' }}>
            You’re signed out, so this preview shows a placeholder name. Sign in to see and
            download your own certificate.
          </p>
        </div>
      ) : null}

      <div className="lms-cert-stage">
        {/* Rendered from the snapshot taken when it was earned, by the same
            component the instructor designs against. `recipientName` is on the
            record itself; `recipient` is only a fallback for a signed-out
            preview, where there is no record to read a name from. */}
        <CertificateDesign
          design={certificate.design}
          recipientName={certificate.recipientName || recipient}
          courseTitle={certificate.title}
          hours={certificate.hours}
          credentialId={certificate.credentialId}
          issuedAt={certificate.issuedAt}
          issuerName={certificate.issuerName}
          signatoryName={certificate.signatoryName}
          signatoryRole={certificate.signatoryRole}
        />
      </div>

      <div className="lms-card lms-noprint" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="check" />
            Verification
          </h2>
        </div>
        <p className="lms-detail__note" style={{ marginTop: 0 }}>
          Anyone can confirm this certificate is genuine at
          {' '}<code>/verify/{certificate.credentialId}</code> without signing in. The page
          shows the course, the recipient and the issue date, and nothing else.
        </p>
        <Link className="lms-btn lms-btn--sm" to="/learn/certificates" style={{ marginTop: 14 }}>
          Back to certificates
        </Link>
      </div>
    </div>
  );
}
