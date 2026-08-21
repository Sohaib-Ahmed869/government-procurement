import { useCallback, useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import { downloadCertificatePdf } from '../../utils/certificatePdf.js';

/* ---------------------------------------------------------------------------
   Download the certificate as a PDF (LMS 12.0b).

   Separate from Print on purpose. They are not the same action:

     Download  hands over a file the learner owns — attachable to an
               application, filed, emailed. Vector text, A4 landscape, the
               credential ID selectable inside it.
     Print     goes through the browser's dialog, which is right when somebody
               wants paper, and which prints headers and footers unless they
               turn them off.

   Collapsing them into one button meant "Download" opened a print dialog, which
   is not what the word promises.
   ------------------------------------------------------------------------ */
export default function CertificateDownload({ certificate, className = '' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = useCallback(async () => {
    if (busy || !certificate) return;
    setBusy(true);
    setError('');
    try {
      await downloadCertificatePdf(certificate);
    } catch (err) {
      // jsPDF is loaded on demand, so this is usually a chunk that failed to
      // arrive. Said out loud rather than leaving a button that did nothing.
      setError(err?.message ?? 'Could not build the PDF just now.');
    } finally {
      setBusy(false);
    }
  }, [busy, certificate]);

  return (
    <>
      <button
        type="button"
        className={className || 'lms-btn lms-btn--primary'}
        onClick={download}
        disabled={busy || !certificate}
      >
        <LmsIcon name="download" />
        {busy ? 'Preparing…' : 'Download PDF'}
      </button>
      {error ? (
        <p className="lms-alert lms-alert--error" style={{ marginTop: 10 }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
