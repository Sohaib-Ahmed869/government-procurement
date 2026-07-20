import { useState, useRef, useEffect } from 'react';
import { useInView } from '../../../hooks/useInView.js';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import photoA from '../../../assets/images/MainPictureHomepage.png';
import photoB from '../../../assets/images/EnhanceExpImage.png';
import photoC from '../../../assets/images/ExpertiseImage.png';
import './InsightsGrid.css';

// Stand-in imagery until per-article photos come from the CMS — cycled across
// the cards so no two neighbours repeat.
const PHOTOS = [photoA, photoB, photoC];

// Article imagery comes from the CMS later; until then each card paints a
// placeholder tint in place of the photo (same approach as the courses cards).
const ARTICLES = [
  {
    id: 1,
    topic: 'Digital',
    date: 'September 2, 2025',
    title: 'The Future of Procurement in a Data-Driven World',
    excerpt:
      "Procurement is no longer just about cost savings and compliance — it's evolving into a strategic, data-driven function. In this article, we explore how advanced analytics, AI, and real-time insights are reshaping procurement decision-making.",
    featured: true,
  },
  {
    id: 2,
    topic: 'Strategy',
    date: 'September 2, 2025',
    title: 'The Role of Governance and Probity in Fair Tendering',
  },
  {
    id: 3,
    topic: 'Strategy',
    date: 'September 2, 2025',
    title: 'How to Build a Procurement Strategy That Delivers Results',
  },
  {
    id: 4,
    topic: 'Procurement 101',
    date: 'September 2, 2025',
    title: 'The Procurement Lifecycle Explained in 7 Steps',
  },
  {
    id: 5,
    topic: 'Procurement 101',
    date: 'September 2, 2025',
    title: 'Procurement vs. Purchasing: Why the Difference Matters',
  },
  {
    id: 6,
    topic: 'Public Sector',
    date: 'September 2, 2025',
    title: 'Transparency in Tendering: Why It Matters for Trust',
  },
  {
    id: 7,
    topic: 'Supplier & Market',
    date: 'September 2, 2025',
    title: 'How to Run a Successful Supplier Engagement Process',
  },
  {
    id: 8,
    topic: 'Supplier & Market',
    date: 'September 2, 2025',
    title: 'Ethical Procurement: Why Social Impact Matters in Supply Chains',
  },
];

const TOPIC_OPTIONS = [
  { value: 'all', label: 'Featured Topics' },
  { value: 'Digital', label: 'Digital' },
  { value: 'Strategy', label: 'Strategy' },
  { value: 'Procurement 101', label: 'Procurement 101' },
  { value: 'Public Sector', label: 'Public Sector' },
  { value: 'Supplier & Market', label: 'Supplier & Market' },
];

const SORT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'a-z', label: 'A–Z' },
  { value: 'z-a', label: 'Z–A' },
];

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
      <span className="insights-card__topic">{topic}</span>
      <span className="insights-card__date">{date}</span>
    </div>
  );
}

export default function InsightsGrid() {
  const { ref, inView } = useInView();
  const [topic, setTopic] = useState('all');
  const [sort, setSort] = useState('none');

  // On mobile the grid is a horizontal snap carousel; track which card is
  // centred so the pagination dots stay in sync.
  const gridRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  let visible = topic === 'all' ? ARTICLES : ARTICLES.filter((a) => a.topic === topic);
  if (sort !== 'none') {
    visible = [...visible].sort((a, b) =>
      sort === 'a-z' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title),
    );
  }

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
        <div className="insights__filters">
          <PillDropdown
            options={TOPIC_OPTIONS}
            value={topic}
            onChange={setTopic}
          />
          <PillDropdown
            label="Sort by:"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
          />
        </div>

        <ul className="insights__grid" ref={gridRef} onScroll={onGridScroll}>
          {visible.map((article, i) => (
            <li
              key={article.id}
              className={`insights-card${article.featured ? ' insights-card--featured' : ''}`}
              style={{ '--i': i }}
            >
              {article.featured ? (
                <article className="insights-card__inner">
                  <img className="insights-card__art" src={PHOTOS[i % PHOTOS.length]} alt="" />
                  <div className="insights-card__scrim" aria-hidden="true" />
                  <CardMeta topic={article.topic} date={article.date} />
                  <h2 className="insights-card__title">{article.title}</h2>
                  <p className="insights-card__excerpt">{article.excerpt}</p>
                  <span className="insights-card__cta">
                    Learn more
                    <span className="insights-card__cta-icon" aria-hidden="true">
                      <img src={arrowIcon} alt="" />
                    </span>
                  </span>
                </article>
              ) : (
                <article className="insights-card__inner">
                  <img className="insights-card__art" src={PHOTOS[i % PHOTOS.length]} alt="" />
                  <div className="insights-card__body">
                    <CardMeta topic={article.topic} date={article.date} />
                    <h2 className="insights-card__title">{article.title}</h2>
                  </div>
                </article>
              )}
            </li>
          ))}
        </ul>

        {/* Pagination dots (mobile carousel only) */}
        <div className="insights__dots">
          {visible.map((article, i) => (
            <button
              key={article.id}
              type="button"
              className={`insights__dot${i === activeCard ? ' is-active' : ''}`}
              aria-label={`Go to article ${i + 1}`}
              onClick={() => scrollToCard(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
