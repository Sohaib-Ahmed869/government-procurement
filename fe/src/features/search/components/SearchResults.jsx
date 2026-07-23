import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { searchApi } from '../../../api';
import './SearchResults.css';

// Tab order and labels. Each key maps to a group in the API response
// ({ articles, questions, courses }) via normaliseGroups below.
const TABS = [
  { key: 'articles', label: 'Articles' },
  { key: 'qa', label: 'Q&A' },
  { key: 'courses', label: 'Courses' },
];

const EMPTY_GROUPS = { articles: [], qa: [], courses: [] };

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Flattens the API payload into per-tab arrays of cards with a common shape so
// the results list can render every content type through the same markup.
function normaliseGroups(res) {
  if (!res) return EMPTY_GROUPS;
  return {
    articles: (res.articles || []).map((a) => ({
      id: a.id,
      to: `/insights/${a.slug}`,
      topic: a.topic,
      date: formatDate(a.date),
      title: a.title,
      excerpt: a.excerpt,
    })),
    qa: (res.questions || []).map((item) => ({
      id: item.id,
      to: `/forum/answers/${item.slug || item.id}`,
      topic: item.category,
      date: formatDate(item.date),
      title: item.title,
      excerpt: item.snippet,
    })),
    courses: (res.courses || []).map((c) => ({
      id: c.id,
      to: `/courses/${c.slug}`,
      topic: 'Course',
      date: formatDate(c.date),
      title: c.title,
      excerpt: c.excerpt,
    })),
  };
}

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';

  // Replay the reveal animation whenever the query changes.
  const { ref, inView } = useInView({ resetKey: q });
  const { audience } = useAudience();

  // Local text-input state so the query is editable before submit.
  const [draft, setDraft] = useState(q);
  const [tab, setTab] = useState('articles');
  const [groups, setGroups] = useState(EMPTY_GROUPS);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error

  // Keep the input in sync when the URL query changes (e.g. header search).
  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    if (!q) {
      setGroups(EMPTY_GROUPS);
      setStatus('idle');
      return undefined;
    }
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const res = await searchApi.query(q, 10);
        if (!alive) return;
        const next = normaliseGroups(res);
        setGroups(next);
        setStatus('ready');
        // Jump to the first tab that actually has results for this query.
        const firstWithHits = TABS.find((t) => next[t.key].length > 0);
        setTab(firstWithHits ? firstWithHits.key : 'articles');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [q]);

  const total =
    groups.articles.length + groups.qa.length + groups.courses.length;
  const activeHits = groups[tab] || [];

  const onSubmit = (e) => {
    e.preventDefault();
    const next = draft.trim();
    setParams(next ? { q: next } : {});
  };

  let summary;
  if (!q) {
    summary = 'Enter a term to search articles, Q&A and courses.';
  } else if (status === 'loading') {
    summary = `Searching for “${q}”…`;
  } else if (status === 'error') {
    summary = 'Something went wrong with your search. Please try again.';
  } else {
    summary = `${total} ${total === 1 ? 'result' : 'results'} for “${q}”`;
  }

  return (
    <section ref={ref} className={`search${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="search__inner">
        <header className="search__header">
          <h1 className="search__title">Search</h1>

          <form className="search__form" role="search" onSubmit={onSubmit}>
            <input
              type="search"
              className="search__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search articles, Q&A and courses…"
              aria-label="Search articles, Q&A and courses"
            />
            <button type="submit" className="search__submit">
              Search
            </button>
          </form>

          <p className="search__summary">{summary}</p>
        </header>

        {status === 'error' ? (
          <p className="search__empty">
            We couldn&apos;t run your search right now. Please try again shortly.
          </p>
        ) : (
          <>
            <div className="search__tabs" role="tablist" aria-label="Result type">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`search__tab${tab === key ? ' is-active' : ''}`}
                  onClick={() => setTab(key)}
                >
                  {label} <span className="search__count">{groups[key].length}</span>
                </button>
              ))}
            </div>

            {activeHits.length === 0 ? (
              <p className="search__empty">
                {!q
                  ? 'No results yet. Enter a term above.'
                  : status === 'loading'
                    ? 'Searching…'
                    : `No results for “${q}”. Try a different term.`}
              </p>
            ) : (
              <ul className="search__results">
                {activeHits.map((item, i) => (
                  <li key={item.id} className="search-card" style={{ '--i': i }}>
                    <Link className="search-card__link" to={item.to}>
                      <div className="search-card__meta">
                        {item.topic && <span className="search-card__topic">{item.topic}</span>}
                        {item.date && <span className="search-card__date">{item.date}</span>}
                      </div>
                      <h2 className="search-card__title">{item.title}</h2>
                      {item.excerpt && <p className="search-card__excerpt">{item.excerpt}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
