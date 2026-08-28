import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import ForumCategories from './ForumCategories.jsx';
import SegmentTitle from '../../../components/shared/SegmentTitle.jsx';
import './ForumHero.css';

// `compact` drops the hero title/intro on small screens — used on the article
// page, where the article's own title takes over directly below the search row.
//
// The search row sits BELOW the heading band rather than inside it. It was in
// the band, which made this page's heading twice the height of every other
// page's and put "Recent Answers" that much further down; and it made the row
// read as part of the title rather than as the first thing the page offers. The
// band is now the same title-only strip the rest of the site has, and the row is
// the top of the page under it — same field, same pill, same order, drawn for a
// paper ground instead of a dark one.
//
// `showSearch` drops the search field from that row. The submit page turns it
// off: you are already writing a question there, and offering to search for one
// instead is the page arguing with itself — and the row it sat in is height the
// form needs to reach the Send button without a scroll.
//
// A title per segment. Win asks about the bid it is writing; Award reads the
// same question from the other side of the table, so it keeps the broader word.
// Both are laid out and the longer one sizes the band, so the strip doesn't
// change height when the toggle is pressed — see SegmentTitle.
const TITLES = {
  win: 'Real Bid Questions, Answered Complementary',
  award: 'Real Procurement Questions, Answered Complementary',
};

export default function ForumHero({ compact = false, showSearch = true }) {
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

  return (
    <>
    <section
      className={`forum-hero${compact ? ' forum-hero--compact' : ''}${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="forum-hero__inner">
        <SegmentTitle
          className="forum-hero__title"
          titles={TITLES}
          audience={audience}
          fallback="win"
        />
      </div>
    </section>

    {/* No strip at all when the search is gone: the submit pill in it points at
        the page you would already be on, and the categories button has moved
        into that page's own heading row — see ForumSubmit. What was left was an
        empty row taking the height above the form. */}
    {showSearch && (
    <div
      className={`forum-tools${compact ? ' forum-tools--compact' : ''}${
        mounted ? ' is-in' : ''
      }`}
      data-audience={audience}
    >
      <div className="forum-tools__inner">
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
          <ForumCategories />
        </div>
      </div>
    </div>
    )}
    </>
  );
}
