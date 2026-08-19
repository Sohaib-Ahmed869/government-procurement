import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import ForumSidebar from './ForumSidebar.jsx';
import './ForumHero.css';

// `compact` drops the hero title/intro on small screens — used on the article
// page, where the article's own title takes over directly below the search row.
export default function ForumHero({ compact = false }) {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal();

  // Search runs through the URL, the same way the category filter does: the
  // field submits to /forum?q=…, and ForumAnswers reads the term from there.
  // That keeps results linkable and the back button working.
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const activeQuery = params.get('q') || '';
  const [query, setQuery] = useState(activeQuery);

  // Follow the URL when it changes underneath us (back button, or landing on a
  // forum page that already carries a query).
  useEffect(() => {
    setQuery(activeQuery);
  }, [activeQuery]);

  const onSearch = (event) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/q-and-a?q=${encodeURIComponent(term)}` : '/q-and-a');
  };

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
        <h1 className="forum-hero__title">
          Question and Answers - Complementary Service
        </h1>

        <div className="forum-hero__tools">
          <form className="forum-hero__search" role="search" onSubmit={onSearch}>
            <button className="forum-hero__search-icon" type="submit" aria-label="Search questions">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" />
              </svg>
            </button>
            <input
              className="forum-hero__search-input"
              type="search"
              aria-label="Search questions"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>

          <Link className="forum-hero__submit" to="/q-and-a/submit" aria-label="Submit a question">
            <span className="forum-hero__submit-label">Submit a question</span>
            {/* Small screens show the pill as a compact "+" circle instead. */}
            <span className="forum-hero__submit-plus" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </Link>

          {/* Mobile-only: opens the categories panel. */}
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
