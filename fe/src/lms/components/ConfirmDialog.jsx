import { useEffect, useRef, useState } from 'react';
import LmsIcon from './LmsIcon.jsx';

/* A confirmation dialog.

   Built on the native <dialog> with showModal(), which brings focus trapping,
   Escape-to-close, inertness of the page behind it and correct screen-reader
   semantics. All of which a div-with-a-backdrop has to reimplement and usually
   gets wrong.

   `requireText` adds a type-to-confirm step. Reserve it for actions that affect
   other people: deleting a course nobody has bought is an undo you don't have,
   but deleting one with 1,800 enrolled learners deserves the friction. */
export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  requireText,
  // An optional free-text note collected with the confirmation and handed to
  // onConfirm. Added for cancelling a live session, where the learners who
  // planned around it deserve a reason rather than a row that just changes
  // colour. Callers that don't pass a label get the old behaviour exactly.
  reasonLabel,
  reasonPlaceholder = '',
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      setTyped('');
      setReason('');
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Escape fires the dialog's own cancel event; route it back through the
  // caller so the parent's state can't drift out of step with the DOM.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onDialogCancel = (e) => {
      e.preventDefault();
      onCancel();
    };
    el.addEventListener('cancel', onDialogCancel);
    return () => el.removeEventListener('cancel', onDialogCancel);
  }, [onCancel]);

  const ready = !requireText || typed.trim() === requireText.trim();

  return (
    <dialog
      ref={ref}
      className="lms-dialog"
      aria-labelledby="lms-dialog-title"
      /* Clicking the backdrop cancels. The check is on the target being the
         dialog itself. Clicks inside the panel bubble from its children. */
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
    >
      <div className={`lms-dialog__panel is-${tone}`}>
        <div className="lms-dialog__head">
          <span className="lms-dialog__icon">
            <LmsIcon name={tone === 'danger' ? 'lock' : 'check'} />
          </span>
          <h2 className="lms-dialog__title" id="lms-dialog-title">
            {title}
          </h2>
        </div>

        <p className="lms-dialog__message">{message}</p>
        {detail ? <p className="lms-dialog__detail">{detail}</p> : null}

        {reasonLabel ? (
          <label className="lms-field lms-dialog__field">
            <span className="lms-field__label">
              {reasonLabel} <span className="lms-field__optional">optional</span>
            </span>
            <textarea
              className="lms-input"
              rows={2}
              value={reason}
              placeholder={reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </label>
        ) : null}

        {requireText ? (
          <label className="lms-field lms-dialog__field">
            <span className="lms-field__label">
              Type <strong>{requireText}</strong> to confirm
            </span>
            <input
              className="lms-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              /* autoFocus is right here: the dialog exists to take this input,
                 and showModal has already moved focus into it. */
              autoFocus
            />
          </label>
        ) : null}

        <div className="lms-dialog__actions">
          <button type="button" className="lms-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`lms-btn ${tone === 'danger' ? 'lms-btn--danger' : 'lms-btn--primary'}`}
            onClick={() => onConfirm(reason.trim())}
            disabled={!ready}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
