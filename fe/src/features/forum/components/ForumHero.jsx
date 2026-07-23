import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import callIcon from '../../../assets/icons/Call.png';
import ForumSidebar from './ForumSidebar.jsx';
import './ForumHero.css';

// `compact` drops the hero title/intro on small screens — used on the article
// page, where the article's own title takes over directly below the search row.
export default function ForumHero({ compact = false }) {
  const { audience } = useAudience();

  // Mount animation: reveal after the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // On phones the sidebar isn't in the flow — the categories button opens it as
  // a full-screen panel instead.
  const [panelOpen, setPanelOpen] = useState(false);

  // Lock background scroll while the panel is open, and let Escape close it.
  useEffect(() => {
    if (!panelOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setPanelOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  return (
    <section
      className={`forum-hero${compact ? ' forum-hero--compact' : ''}${mounted ? ' is-in' : ''}${panelOpen ? ' is-panel-open' : ''}`}
      data-audience={audience}
    >
      <div className="forum-hero__inner">
        <h1 className="forum-hero__title">Get your answers</h1>
        <p className="forum-hero__sub">
          Your guide to navigating complex tenders, compliance challenges, and
          contract decisions. Practical insights for both agencies and suppliers.
        </p>

        <div className="forum-hero__tools">
          <form className="forum-hero__search" role="search" onSubmit={(e) => e.preventDefault()}>
            <span className="forum-hero__search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" />
              </svg>
            </span>
            <input
              className="forum-hero__search-input"
              type="search"
              aria-label="Search"
              placeholder="Search"
            />
          </form>

          <a className="forum-hero__submit" href="/forum/submit" aria-label="Submit a question">
            <span className="forum-hero__submit-icon" aria-hidden="true">
              <img src={callIcon} alt="" />
            </span>
            <span className="forum-hero__submit-label">Submit a question</span>
            {/* Small screens show the pill as a compact "+" circle instead. */}
            <span className="forum-hero__submit-plus" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </a>

          {/* Mobile-only: opens the categories / featured-questions panel. */}
          <button
            type="button"
            className="forum-hero__categories"
            aria-label="Browse categories"
            aria-expanded={panelOpen}
            aria-controls="forum-category-panel"
            onClick={() => setPanelOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      <div
        id="forum-category-panel"
        className={`forum-hero__panel${panelOpen ? ' is-open' : ''}`}
      >
        <button
          type="button"
          className="forum-hero__panel-close"
          aria-label="Close"
          onClick={() => setPanelOpen(false)}
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
            if (e.target.closest('a')) setPanelOpen(false);
          }}
        >
          <ForumSidebar />
        </div>
      </div>
    </section>
  );
}
