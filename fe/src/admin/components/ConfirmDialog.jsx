import { useEffect } from 'react';

// A simple confirm modal. Render it conditionally (when `open`) and wire
// onConfirm/onCancel. Used before destructive actions like delete.
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
  busy,
}) {
  // Allow Escape to dismiss (unless a request is in flight).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="admin-modal__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`admin-modal__icon${danger ? ' admin-modal__icon--danger' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round">
            {danger ? (
              <>
                <path d="M10.3 4 2.6 18a1.7 1.7 0 0 0 1.5 2.5h15.8A1.7 1.7 0 0 0 21.4 18L13.7 4a1.7 1.7 0 0 0-3 0z" />
                <path d="M12 9v4M12 17h.01" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </>
            )}
          </svg>
        </div>
        <h2 className="admin-modal__title">{title}</h2>
        {message && <p className="admin-modal__text">{message}</p>}
        <div className="admin-modal__actions">
          <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`admin-btn ${danger ? 'admin-btn--danger' : 'admin-btn--primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
