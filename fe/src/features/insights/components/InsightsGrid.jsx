import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { articlesApi, categoriesApi } from '../../../api';
import './InsightsGrid.css';


function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function Chevron({ open }) {
  return (
    <span className={`insights-pill__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  );
}

// Pill-shaped dropdown used by both filter controls.
function PillDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="insights-pill" ref={ref}>
      <button
        type="button"
        className="insights-pill__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label ? `${label} ${current.label}` : current.label}
        <Chevron open={open} />
      </button>

      {open && (
        <ul className="insights-pill__menu" role="listbox">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`insights-pill__option${o.value === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Measured from the article's own body at 200 words per minute — the same
// formula the CMS editor shows beneath the body field (RichTextEditor's
// computeStats). Derived rather than read from the stored `readingMinutes`,
// because that field only updates when someone saves the article, so an edited
// (or seeded) article can carry a figure that no longer matches its text. The
// stored value is the fallback for when the body isn't in the response.
function readingMinutes(article) {
  const words = String(article.body || '')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  if (words) return Math.max(1, Math.round(words / 200));
  return article.readingMinutes > 0 ? article.readingMinutes : 0;
}

// Three rows of the 4-up desktop grid; "View more" adds another batch.
const PAGE_SIZE = 12;

export default function InsightsGrid() {
  const { ref, inView } = useInView();
  const { audience } = useAudience();
  // The selected category id, or 'all'.
  const [category, setCategory] = useState('all');

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // On mobile the grid is a horizontal snap carousel; track which card is
  // centred so the pagination dots stay in sync.
  const gridRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Categories come from the CMS taxonomy, not from the articles, so the
        // filter offers exactly what an editor set up (and in their order). A
        // failed category fetch just leaves the filter empty — the grid stays.
        const [list, cats] = await Promise.all([
          articlesApi.list({ limit: 100 }),
          categoriesApi.list({ kind: 'article' }).catch(() => []),
        ]);
        if (!alive) return;
        setArticles(list || []);
        setCategories(cats || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Only categories that actually have a published insight under them, so every
  // option in the dropdown leads somewhere.
  const categoryOptions = useMemo(() => {
    const used = new Set(articles.map((a) => a.category?._id).filter(Boolean));
    const inUse = categories.filter((c) => used.has(c._id || c.id));
    return [
      { value: 'all', label: 'Featured Topics' },
      ...inUse.map((c) => ({ value: c._id || c.id, label: c.name })),
    ];
  }, [articles, categories]);

  const visible = useMemo(
    () => (category === 'all' ? articles : articles.filter((a) => a.category?._id === category)),
    [articles, category],
  );

  // How many of the filtered articles are on screen. Reset whenever the filter
  // changes, so a new selection starts from the first page again.
  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [category]);

  const onScreen = visible.slice(0, shown);

  const onGridScroll = () => {
    const el = gridRef.current;
    const card = el?.querySelector('.insights-card');
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const step = card.getBoundingClientRect().width + gap;
    const idx = step ? Math.round(el.scrollLeft / step) : 0;
    setActiveCard(Math.max(0, Math.min(shown - 1, idx)));
  };

  const scrollToCard = (i) => {
    const cards = gridRef.current?.querySelectorAll('.insights-card');
    cards?.[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <section ref={ref} className={`insights${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="insights__inner">
        {status === 'ready' && articles.length > 0 && (
          <div className="insights__filters">
            <PillDropdown options={categoryOptions} value={category} onChange={setCategory} />
          </div>
        )}

        {status === 'loading' && <p className="insights__empty">Loading insights…</p>}
        {status === 'error' && (
          <p className="insights__empty">
            We couldn&apos;t load our insights right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && visible.length === 0 && (
          <p className="insights__empty">No insights have been published yet.</p>
        )}

        {status === 'ready' && visible.length > 0 && (
          <ul className="insights__grid" ref={gridRef} onScroll={onGridScroll}>
            {onScreen.map((article, i) => {
              // Only what the CMS provides — no placeholder image. Cards without a
              // hero image fall back to the tile's own solid background colour.
              const image = article.heroImage?.url || null;
              const date = formatDate(article.publishedAt);
              const minutes = readingMinutes(article);
              // "Strategy | 4 min read" — either half may be missing. The
              // category name is the topic label.
              const meta = [article.category?.name, minutes ? `${minutes} min read` : null]
                .filter(Boolean)
                .join(' | ');
              return (
                <li key={article._id} className="insights-card" style={{ '--i': i % PAGE_SIZE }}>
                  {/* Image on top, then topic, title and a date-led summary —
                      everything visible at rest, nothing revealed on hover. */}
                  <Link to={`/insights/${article.slug}`} className="insights-card__inner">
                    <span className="insights-card__art">
                      {image && <img src={image} alt="" />}
                    </span>

                    {meta && <span className="insights-card__topic">{meta}</span>}

                    <h2 className="insights-card__title">
                      {article.title}
                      <svg
                        className="insights-card__chevron"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                      >
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                    </h2>

                    {date && (
                      <p className="insights-card__summary">
                        <span className="insights-card__date">{date}</span>
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {status === 'ready' && visible.length > shown && (
          <button type="button" className="insights__more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            View more
          </button>
        )}

        {/* Pagination dots — shown only in the mobile carousel. */}
        {status === 'ready' && visible.length > 0 && (
          <div className="insights__dots">
            {onScreen.map((article, i) => (
              <button
                key={article._id}
                type="button"
                className={`insights__dot${i === activeCard ? ' is-active' : ''}`}
                aria-label={`Go to article ${i + 1}`}
                onClick={() => scrollToCard(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
