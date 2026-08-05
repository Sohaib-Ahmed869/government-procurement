import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { coursesApi } from '../../../api';
import menuIcon from '../../../assets/icons/Menu.png';
import levelIcon from '../../../assets/icons/LevelIcon.png';
import './CoursesBrowser.css';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
];

// Availability badge copy keyed on the course's `availability` state.
const AVAILABILITY_LABEL = {
  open: 'Open',
  coming_soon: 'Coming soon',
  closed: 'Closed',
};

const CATEGORY_OPTS = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
];
const LEVEL_OPTS = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function FilterGroup({ icon, heading, name, options, value, onChange }) {
  return (
    <div className="courses-filter">
      <h3 className="courses-filter__heading">
        <span className="courses-filter__icon">{icon}</span>
        {heading}
      </h3>
      <div className="courses-filter__options">
        {options.map((opt) => (
          <label key={opt.value} className="courses-radio">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span className="courses-radio__dot" aria-hidden="true" />
            <span className="courses-radio__label">{opt.label}</span>
            {opt.badge && <span className="courses-radio__badge">{opt.badge}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  return (
    <div className="courses-sort" ref={ref}>
      <span className="courses-sort__label">Sort by:</span>
      <div className="courses-sort__control">
        <button
          type="button"
          className="courses-sort__button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {current.label}
          <span className={`courses-sort__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {open && (
          <ul className="courses-sort__menu" role="listbox">
            {SORT_OPTIONS.map((o) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  className={`courses-sort__option${o.value === value ? ' is-active' : ''}`}
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
    </div>
  );
}

export default function CoursesBrowser() {
  const { audience } = useAudience();
  // Revealed with the hero rather than on scroll. This section sits directly
  // under a short hero and is taller than the viewport, so it never satisfied
  // the observer's threshold on a shorter screen — the page looked like it
  // ended below the intro until you scrolled.
  const inView = useMountReveal(audience);
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [sort, setSort] = useState('popular');

  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await coursesApi.list({ limit: 100 });
        if (!alive) return;
        setCourses(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // On phones the filter sidebar isn't in the flow — the "All Resources" button
  // opens it as a panel instead.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lock background scroll while the panel is open, and let Escape close it.
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  // Apply the side filters and the sort. Missing fields fall back to their
  // model defaults so older records aren't hidden.
  const visible = useMemo(() => {
    const filtered = courses.filter((c) => {
      if (category !== 'all' && (c.segment || 'general') !== category) return false;
      if (level !== 'all' && (c.level || 'beginner') !== level) return false;
      return true;
    });

    const byNewest = (a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

    const sorted = [...filtered];
    switch (sort) {
      case 'newest':
        sorted.sort(byNewest);
        break;
      case 'popular':
      default:
        // Featured first, then newest.
        sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || byNewest(a, b));
        break;
    }
    return sorted;
  }, [courses, category, level, sort]);

  return (
    <section className={`courses-browse${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="courses-browse__inner">
        {/* Sidebar on desktop; a slide-up panel on phones. */}
        <div
          id="courses-filter-panel"
          className={`courses-filters-wrap${filtersOpen ? ' is-open' : ''}`}
        >
          <button
            type="button"
            className="courses-filters__close"
            aria-label="Close"
            onClick={() => setFiltersOpen(false)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>

          <aside className="courses-filters">
          <FilterGroup
            icon={<img className="courses-filter__img" src={menuIcon} alt="" />}
            heading="Categories"
            name="category"
            options={CATEGORY_OPTS}
            value={category}
            onChange={setCategory}
          />
          <FilterGroup
            icon={<img className="courses-filter__img" src={levelIcon} alt="" />}
            heading="Level"
            name="level"
            options={LEVEL_OPTS}
            value={level}
            onChange={setLevel}
          />
          </aside>
        </div>

        <div className="courses-main">
          <button
            type="button"
            className="courses-resource__button"
            aria-expanded={filtersOpen}
            aria-controls="courses-filter-panel"
            onClick={() => setFiltersOpen(true)}
          >
            All Resources
            <span className="courses-resource__chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          <div className="courses-main__head">
            <h2 className="courses-main__title">All Resources</h2>
            <SortDropdown value={sort} onChange={setSort} />
          </div>

          {status === 'loading' && <p className="courses-main__title">Loading courses…</p>}
          {status === 'error' && (
            <p className="courses-main__title">
              We couldn&apos;t load the courses right now. Please try again shortly.
            </p>
          )}
          {status === 'ready' && visible.length === 0 && (
            <p className="courses-main__title">
              {courses.length === 0
                ? 'No courses have been published yet.'
                : 'No resources match these filters.'}
            </p>
          )}

          {status === 'ready' && visible.length > 0 && (
            <ul className="courses-grid">
              {visible.map((course, i) => (
                <li key={course._id || course.id} className="courses-card" style={{ '--i': i }}>
                  <Link className="courses-card__link" to={`/courses/${course.slug}`}>
                    <div
                      className="courses-card__art"
                      style={
                        course.image?.url
                          ? { backgroundImage: `url(${course.image.url})` }
                          : undefined
                      }
                    />
                    <div className="courses-card__body">
                      <div className="courses-card__tags">
                        {course.availability && (
                          <span className="courses-tag">
                            {AVAILABILITY_LABEL[course.availability] || course.availability}
                          </span>
                        )}
                        {course.durationLabel && (
                          <span className="courses-card__level">{course.durationLabel}</span>
                        )}
                      </div>
                      <h3 className="courses-card__title">{course.title}</h3>
                      {course.summary && <p className="courses-card__desc">{course.summary}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
