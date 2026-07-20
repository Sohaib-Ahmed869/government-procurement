import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import resourcesIcon from '../../../assets/icons/ResourcesIcon.png';
import './CoursesBrowser.css';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

const CATEGORY_LABEL = { win: 'Win Contracts', award: 'Award Contracts' };

const COURSE_TITLE = 'Introduction to Government Procurement';
const COURSE_DESC =
  'Gain a clear understanding of how public sector buying works — from the underlying principles and policies that guide procurement, to the step-by-step processes that drive purchasing decisions.';

// The image area is left empty for now — real course imagery will come from the
// CMS/backend later.
const COURSES = [
  { id: 1, category: 'win', level: 'Foundational' },
  { id: 2, category: 'award', level: 'Foundational' },
  { id: 3, category: 'win', level: 'Foundational' },
  { id: 4, category: 'award', level: 'Foundational' },
  { id: 5, category: 'win', level: 'Foundational' },
  { id: 6, category: 'award', level: 'Foundational' },
];

const RESOURCE_OPTS = [
  { value: 'all', label: 'All Resources' },
  { value: 'courses', label: 'Courses' },
  { value: 'artefacts', label: 'Artefacts' },
  { value: 'bundles', label: 'Bundles', badge: 'Save more' },
];
const CATEGORY_OPTS = [
  { value: 'general', label: 'General' },
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
];
const LEVEL_OPTS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function CategoriesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LevelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="9" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  );
}

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
  const { ref, inView } = useInView();
  const [resource, setResource] = useState('all');
  const [category, setCategory] = useState('general');
  const [level, setLevel] = useState('beginner');
  const [sort, setSort] = useState('popular');

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

  const currentResource =
    RESOURCE_OPTS.find((o) => o.value === resource) ?? RESOURCE_OPTS[0];

  const visible =
    category === 'general'
      ? COURSES
      : COURSES.filter((c) => c.category === category);

  return (
    <section ref={ref} className={`courses-browse${inView ? ' is-in' : ''}`}>
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
            icon={<img className="courses-filter__img" src={resourcesIcon} alt="" />}
            heading="Resources"
            name="resource"
            options={RESOURCE_OPTS}
            value={resource}
            onChange={setResource}
          />
          <FilterGroup
            icon={<CategoriesIcon />}
            heading="Categories"
            name="category"
            options={CATEGORY_OPTS}
            value={category}
            onChange={setCategory}
          />
          <FilterGroup
            icon={<LevelIcon />}
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
            {currentResource.label}
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

          <ul className="courses-grid">
            {visible.map((course, i) => (
              <li key={course.id} className="courses-card" style={{ '--i': i }}>
                <Link className="courses-card__link" to={`/courses/${course.id}`}>
                  <div className="courses-card__art" />
                  <div className="courses-card__body">
                    <div className="courses-card__tags">
                      <span className="courses-tag">{CATEGORY_LABEL[course.category]}</span>
                      <span className="courses-card__level">{course.level}</span>
                    </div>
                    <h3 className="courses-card__title">{COURSE_TITLE}</h3>
                    <p className="courses-card__desc">{COURSE_DESC}</p>
                    <p className="courses-card__price">$100</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
