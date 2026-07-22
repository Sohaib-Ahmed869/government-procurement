import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { articlesApi } from '../../../api';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import photoA from '../../../assets/images/MainPictureHomepage.png';
import photoB from '../../../assets/images/EnhanceExpImage.png';
import photoC from '../../../assets/images/ExpertiseImage.png';
import './InsightsGrid.css';

// Stand-in imagery used when an article has no hero image from the CMS — cycled
// across the cards so no two neighbours repeat.
const PHOTOS = [photoA, photoB, photoC];

const SORT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'a-z', label: 'A–Z' },
  { value: 'z-a', label: 'Z–A' },
];

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

function CardMeta({ topic, date }) {
  return (
    <div className="insights-card__meta">
      {topic && <span className="insights-card__topic">{topic}</span>}
      {date && <span className="insights-card__date">{date}</span>}
    </div>
  );
}

export default function InsightsGrid() {
  const { ref, inView } = useInView();
  const [topic, setTopic] = useState('all');
  const [sort, setSort] = useState('none');

  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // On mobile the grid is a horizontal snap carousel; track which card is
  // centred so the pagination dots stay in sync.
  const gridRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await articlesApi.list({ limit: 100 });
        if (!alive) return;
        setArticles(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Topic pills derived from the distinct topic values present in the data.
  const topicOptions = useMemo(() => {
    const topics = [...new Set(articles.map((a) => a.topic).filter(Boolean))];
    return [{ value: 'all', label: 'Featured Topics' }, ...topics.map((t) => ({ value: t, label: t }))];
  }, [articles]);

  const visible = useMemo(() => {
    let list = topic === 'all' ? articles : articles.filter((a) => a.topic === topic);
    if (sort !== 'none') {
      list = [...list].sort((a, b) =>
        sort === 'a-z'
          ? (a.title || '').localeCompare(b.title || '')
          : (b.title || '').localeCompare(a.title || ''),
      );
    }
    return list;
  }, [articles, topic, sort]);

  const onGridScroll = () => {
    const el = gridRef.current;
    const card = el?.querySelector('.insights-card');
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const step = card.getBoundingClientRect().width + gap;
    const idx = step ? Math.round(el.scrollLeft / step) : 0;
    setActiveCard(Math.max(0, Math.min(visible.length - 1, idx)));
  };

  const scrollToCard = (i) => {
    const cards = gridRef.current?.querySelectorAll('.insights-card');
    cards?.[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <section ref={ref} className={`insights${inView ? ' is-in' : ''}`}>
      <div className="insights__inner">
        {status === 'ready' && articles.length > 0 && (
          <div className="insights__filters">
            <PillDropdown options={topicOptions} value={topic} onChange={setTopic} />
            <PillDropdown label="Sort by:" options={SORT_OPTIONS} value={sort} onChange={setSort} />
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
            {visible.map((article, i) => {
              const image = article.heroImage?.url || PHOTOS[i % PHOTOS.length];
              const date = formatDate(article.publishedAt);
              return (
                <li key={article._id} className="insights-card" style={{ '--i': i }}>
                  {/* Every card is identical: photo + title by default, and on
                      hover the whole tile darkens and the meta, excerpt and CTA
                      animate in — the rich "featured" look, for all cards. */}
                  <Link to={`/insights/${article.slug}`} className="insights-card__inner">
                    <img className="insights-card__art" src={image} alt="" />
                    <div className="insights-card__scrim insights-card__scrim--base" aria-hidden="true" />
                    <div className="insights-card__scrim insights-card__scrim--full" aria-hidden="true" />
                    <div className="insights-card__body">
                      <div className="insights-card__meta-slot insights-card__reveal">
                        <CardMeta topic={article.topic} date={date} />
                      </div>
                      <h2 className="insights-card__title">{article.title}</h2>
                      {article.excerpt && (
                        <p className="insights-card__excerpt insights-card__reveal">
                          {article.excerpt}
                        </p>
                      )}
                      <span className="insights-card__cta insights-card__reveal">
                        Learn more
                        <span className="insights-card__cta-icon" aria-hidden="true">
                          <img src={arrowIcon} alt="" />
                        </span>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination dots — shown only in the mobile carousel. */}
        {status === 'ready' && visible.length > 0 && (
          <div className="insights__dots">
            {visible.map((article, i) => (
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
