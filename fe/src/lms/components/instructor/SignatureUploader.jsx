import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import SignaturePad from './SignaturePad.jsx';

/* The signatory's signature, drawn here and printed on the certificate.

   Drawn rather than uploaded. Asking for "a PNG of your signature on a
   transparent background" is asking an instructor to own a scanner and an image
   editor; the pad takes ten seconds with a trackpad. See SignaturePad for how
   the drawing is trimmed to the ink.

   It still travels the upload path — the pad hands over a PNG File and this
   posts it exactly as a scan would have gone. That matters: the API strips any
   `signature` arriving on a PATCH, so this endpoint is the only way one is ever
   set, and a certificate can never be made to print an image from somewhere
   else.

   It saves the moment the signature is taken, ahead of the debounced
   certificate PATCH the rest of this tab rides on: a multipart upload is not
   something to batch behind a text field.

   `onUpload` and `onRemove` are supplied by whichever builder is hosting this,
   because a course and a learning path keep their certificate on different
   documents behind different ownership checks. */

/* Where the signature block sits along the foot of the certificate. Three
   places rather than free positioning: the certificate is a laid-out document
   that also has to redraw as a PDF and on paper, and a signature dragged to an
   arbitrary point would have to be re-derived in millimetres for print. Left is
   where a signature conventionally goes; the other two are for a certificate
   whose foot carries something else. */
export const SIGNATURE_POSITIONS = [
  { value: 'left', label: 'Bottom left' },
  { value: 'center', label: 'Bottom centre' },
  { value: 'right', label: 'Bottom right' },
];

export default function SignatureUploader({
  signature,
  position = 'left',
  onUpload,
  onRemove,
  onPositionChange,
  noun = 'course',
  disabled = false,
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [padOpen, setPadOpen] = useState(false);

  const take = async (file) => {
    setError('');
    setBusy(true);
    try {
      await onUpload(file);
      setPadOpen(false);
    } catch (err) {
      setError(err?.message ?? 'That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError('');
    setBusy(true);
    try {
      await onRemove();
    } catch (err) {
      setError(err?.message ?? 'Could not remove the signature.');
    } finally {
      setBusy(false);
    }
  };

  const url = signature?.url || '';

  return (
    <div className="lms-field">
      <span className="lms-field__label">
        Signature
        <span className="lms-field__optional"> optional</span>
      </span>

      {url ? (
        <div className="lms-sigup">
          <div className="lms-sigup__preview">
            <img src={url} alt="Your signature as it will print" />
          </div>
          <div className="lms-sigup__actions">
            <button
              type="button"
              className="lms-btn lms-btn--sm"
              disabled={busy || disabled}
              onClick={() => setPadOpen(true)}
            >
              {busy ? 'Working…' : 'Sign again'}
            </button>
            <button
              type="button"
              className="lms-btn lms-btn--sm lms-btn--danger"
              disabled={busy || disabled}
              onClick={remove}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="lms-sigup__drop"
          disabled={busy || disabled}
          onClick={() => setPadOpen(true)}
        >
          <LmsIcon name="note" className="lms-sigup__icon" />
          <span className="lms-sigup__title">{busy ? 'Saving…' : 'Add your signature'}</span>
        </button>
      )}

      {error ? <p className="lms-field__error">{error}</p> : null}

      {disabled && !url ? (
        <span className="lms-field__hint">
          Save this {noun} first, then a signature can be added to it.
        </span>
      ) : (
        <span className="lms-field__hint">
          Signed here with a mouse, trackpad, finger or stylus. Certificates already
          issued keep the signature they were issued with.
        </span>
      )}

      {/* Placement is only a question once there is something to place. */}
      {url && onPositionChange ? (
        <div className="lms-sigup__place">
          <span className="lms-field__label">Where it prints</span>
          <div className="lms-sigup__places">
            {SIGNATURE_POSITIONS.map((p) => (
              <label
                key={p.value}
                className={`lms-sigup__place-opt${position === p.value ? ' is-active' : ''}`}
              >
                <input
                  type="radio"
                  name="signature-position"
                  value={p.value}
                  checked={position === p.value}
                  onChange={() => onPositionChange(p.value)}
                  disabled={disabled}
                />
                <span className={`lms-sigup__place-mark is-${p.value}`} aria-hidden="true" />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
          <span className="lms-field__hint">
            The preview beside this form shows exactly where it lands.
          </span>
        </div>
      ) : null}

      {padOpen ? (
        <SignaturePad busy={busy} onCancel={() => setPadOpen(false)} onUse={take} />
      ) : null}
    </div>
  );
}
