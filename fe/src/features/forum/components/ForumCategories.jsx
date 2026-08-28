import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ForumSidebar from './ForumSidebar.jsx';

// The categories button and the full-screen panel it opens, as one piece.
//
// Below 1024px the sidebar is out of the page flow, so this button is the only
// way into the categories. It used to live inside ForumHero's tools strip and
// nowhere else, which was fine while every forum page led with that strip — and
// wrong on the submit page, where the strip holds nothing else and stood as a
// row of its own above the heading for the sake of one circle. Owning its state
// here is what lets either component render it wherever that page wants it.
//
// The panel goes through a portal to <body>. It is `position: fixed`, but both
// places that render this button sit inside a stacking context of their own
// (`position: relative; z-index: 1`), which traps a fixed child however high its
// z-index — ForumHero used to work around that by lifting the whole strip to
// z-index 150 while the panel was open. Out at the body there is nothing to
// escape, so the workaround goes with it.
export default function ForumCategories({ className = '' }) {
  const [open, setOpen] = useState(false);

  // Lock background scroll while the panel is open, and let Escape close it.
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`forum-hero__categories ${className}`.trim()}
        aria-label="Browse categories"
        aria-expanded={open}
        aria-controls="forum-category-panel"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {createPortal(
        <div
          id="forum-category-panel"
          className={`forum-hero__panel${open ? ' is-open' : ''}`}
        >
          <button
            type="button"
            className="forum-hero__panel-close"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>

          {/* Any link inside navigates away, so close the panel with it. */}
          <div
            className="forum-hero__panel-body"
            onClick={(e) => {
              if (e.target.closest('a')) setOpen(false);
            }}
          >
            <ForumSidebar />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
