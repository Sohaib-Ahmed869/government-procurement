import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';
import { certificatesApi } from '../../api/lms.js';
import './VerifyCertificatePage.css';

/* ---------------------------------------------------------------------------
   Public certificate verification (LMS 12.0b).

   Whoever opens this has no account and is not going to make one: they are an
   employer or a panel with a credential ID in front of them, and one question.
   So it is a public route on the main site rather than anything under /learn,
   it takes no sign-in, and it answers in a sentence before it shows a table.

   FOUR outcomes, and keeping them apart is the whole job:

     genuine    the credential exists and stands
     withdrawn  it existed and was revoked — NOT the same as fake, and an
                employer needs to be told which
     not found  no such credential
     unchecked  we could not reach the server

   The last one matters most. A network failure must never read as "this
   certificate is not genuine": that is an accusation about a real person, made
   because of an outage. It says plainly that the check did not run.

   Shows the course, the recipient and the issue date, and nothing else — which
   is exactly what the certificate page in the LMS promises whoever it hands the
   link to, and what the server's toVerification() will part with.
   ------------------------------------------------------------------------ */

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// IDs are printed on the certificate as GP-2026-A1B2C3D4 and get retyped by
// hand, so they are read case-insensitively and with stray spaces forgiven.
const tidy = (raw) => String(raw ?? '').trim().toUpperCase();

export default function VerifyCertificatePage() {
  const { credentialId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState(credentialId ? 'loading' : 'idle');
  const [certificate, setCertificate] = useState(null);
  const [typed, setTyped] = useState('');

  // A person's name is on this page, so it stays out of search results. There
  // is no Seo component in this project yet (components/seo/Seo.jsx is an empty
  // stub), so the tag is managed here and removed on the way out.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!credentialId) {
      setStatus('idle');
      return undefined;
    }

    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const data = await certificatesApi.verify(tidy(credentialId));
        if (!alive) return;
        setCertificate(data);
        setStatus(data?.valid ? 'valid' : 'revoked');
      } catch (err) {
        if (!alive) return;
        // 404 is an answer: there is no such credential. Anything else is our
        // problem, not a verdict on the certificate.
        setStatus(err?.status === 404 || err?.statusCode === 404 ? 'notfound' : 'error');
      }
    })();

    return () => {
      alive = false;
    };
  }, [credentialId]);

  const lookup = useCallback(
    (e) => {
      e.preventDefault();
      const id = tidy(typed);
      if (id) navigate(`/verify/${encodeURIComponent(id)}`);
    },
    [typed, navigate],
  );

  const form = (
    <form className="verify__form" onSubmit={lookup}>
      <label className="verify__label" htmlFor="credential-id">
        Credential ID
      </label>
      <div className="verify__row">
        <input
          id="credential-id"
          className="verify__input"
          value={typed}
          autoFocus={status === 'idle'}
          placeholder="GP-2026-XXXXXXXX"
          // Printed on the certificate, usually near the bottom edge.
          onChange={(e) => setTyped(e.target.value)}
        />
        <button type="submit" className="verify__submit" disabled={!tidy(typed)}>
          Check
        </button>
      </div>
    </form>
  );

  if (status === 'idle') {
    return (
      <div className="page-scale">
        <PageLayout>
          <SystemMessage
            eyebrow="Certificate check"
            title="Verify a certificate"
            message="Enter the credential ID printed on the certificate. No account needed."
          >
            {form}
          </SystemMessage>
        </PageLayout>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="page-scale">
        <PageLayout>
          <SystemMessage eyebrow="Certificate check" title="Checking…" message={tidy(credentialId)} />
        </PageLayout>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page-scale">
        <PageLayout>
          <SystemMessage
            eyebrow="Couldn’t check"
            title="We couldn’t verify this right now"
            /* Deliberately says nothing about the certificate itself. */
            message="Something went wrong at our end, so this check didn't run. It doesn't mean the certificate is invalid. Please try again shortly."
            actions={[{ label: 'Try again', to: `/verify/${encodeURIComponent(tidy(credentialId))}` }]}
          />
        </PageLayout>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="page-scale">
        <PageLayout>
          <SystemMessage
            eyebrow="Not found"
            title="No certificate with that ID"
            message="Nothing we have issued carries this credential ID. It may have been mistyped — they are easy to misread, so it is worth checking against the document."
          >
            <p className="verify__echo">
              Checked: <code>{tidy(credentialId)}</code>
            </p>
            {form}
          </SystemMessage>
        </PageLayout>
      </div>
    );
  }

  const revoked = status === 'revoked';

  return (
    <div className="page-scale">
      <PageLayout>
        <SystemMessage
          eyebrow={revoked ? 'Withdrawn' : 'Verified'}
          title={revoked ? 'This certificate has been withdrawn' : 'This certificate is genuine'}
          message={
            revoked
              ? 'It was issued by us and has since been revoked, so it should not be relied on. That is different from a certificate that was never issued.'
              : 'It was issued by us and still stands.'
          }
        >
          <dl className={`verify__facts${revoked ? ' is-revoked' : ''}`}>
            <div>
              <dt>Awarded to</dt>
              <dd>{certificate.recipientName || '—'}</dd>
            </div>
            <div>
              <dt>For</dt>
              <dd>{certificate.title || '—'}</dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{formatDate(certificate.issuedAt) || '—'}</dd>
            </div>
            {certificate.hours ? (
              <div>
                <dt>Hours</dt>
                <dd>{certificate.hours}</dd>
              </div>
            ) : null}
            <div>
              <dt>Issued by</dt>
              <dd>{certificate.issuerName || '—'}</dd>
            </div>
            <div>
              <dt>Credential ID</dt>
              <dd><code>{certificate.credentialId}</code></dd>
            </div>
            {revoked && certificate.revokedAt ? (
              <div>
                <dt>Withdrawn</dt>
                <dd>{formatDate(certificate.revokedAt)}</dd>
              </div>
            ) : null}
          </dl>

          <details className="verify__more">
            <summary>Check another certificate</summary>
            {form}
          </details>
        </SystemMessage>
      </PageLayout>
    </div>
  );
}
