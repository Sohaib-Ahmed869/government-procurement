import { useEffect } from 'react';

// Right-side slide-in panel used for create/edit forms across the CMS, so list
// screens stay clean and the form appears on demand. Render conditionally on
// `open`; wrap your fields in <form> and pass footer actions via `footer`.
//
// Props:
//   open      – whether the drawer is shown
//   title     – heading text
//   subtitle  – optional muted line under the title
//   onClose   – called on backdrop click, close button, or Escape
//   footer    – node pinned to the bottom (e.g. Save / Cancel buttons)
//   width     – optional CSS width (default 440px)
//   busy      – when true, Escape/backdrop close is disabled
export default function AdminDrawer({
  open,
  title,
  subtitle,
  onClose,
  footer,
  width,
  busy = false,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="admin-drawer__backdrop" role="presentation" onClick={busy ? undefined : onClose}>
      <aside
        className="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-drawer__head">
          <div className="admin-drawer__heading">
            <h2 className="admin-drawer__title">{title}</h2>
            {subtitle && <p className="admin-drawer__subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="admin-drawer__close"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="admin-drawer__body">{children}</div>

        {footer && <footer className="admin-drawer__foot">{footer}</footer>}
      </aside>
    </div>
  );
}
