import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { bundlesApi, coursesApi } from '../../../api';
import './CoursesBrowser.css';

// Whole dollars: these are course prices, and the cents are always zero.
const formatPrice = (n, currency = 'AUD') =>
  Number(n) > 0
    ? new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(Number(n))
    : 'Free';

// Availability badge copy keyed on the course's `availability` state.
const AVAILABILITY_LABEL = {
  open: 'Open',
  coming_soon: 'Coming soon',
  closed: 'Closed',
};

// "Bundles" is not a course segment — it swaps the grid over to bundles
// entirely, because a bundle is several courses and has nothing to say about
// which audience a single one is for. It sits last, after the two contract
// categories.
const CATEGORY_OPTS = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
  { value: 'bundles', label: 'Bundles' },
];

// Four rows of the 3-up desktop grid. Anything that would start a fifth row
// waits behind "View more", the same as the insights grid.
const PAGE_SIZE = 12;

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

export default function CoursesBrowser() {
  const { audience } = useAudience();
  // Revealed with the hero rather than on scroll. This section sits directly
  // under a short hero and is taller than the viewport, so it never satisfied
  // the observer's threshold on a shorter screen — the page looked like it
  // ended below the intro until you scrolled.
  const inView = useMountReveal();
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');

  const [courses, setCourses] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Bundles are a separate resource, fetched alongside rather than after
        // the filter is switched: one round trip on load beats a spinner every
        // time somebody flicks between the two.
        const [list, bundleList] = await Promise.all([
          coursesApi.list({ limit: 100 }),
          bundlesApi.list({ limit: 100 }).catch(() => []),
        ]);
        if (!alive) return;
        setCourses(list || []);
        setBundles(bundleList || []);
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

  // Apply the side filters. Missing fields fall back to their model defaults so
  // older records aren't hidden.
  //
  // The order is fixed at featured-first, then newest — what the "Popular" sort
  // did, and the only order left now that the sort control has gone.
  const showingBundles = category === 'bundles';

  const visible = useMemo(() => {
    const byNewest = (a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

    // A bundle has no level, so the level filter has nothing to say about one.
    // Applying it anyway would empty the grid the moment somebody left a level
    // ticked from the tab before.
    if (showingBundles) return [...bundles].sort(byNewest);

    const filtered = courses.filter((c) => {
      if (category !== 'all' && (c.segment || 'general') !== category) return false;
      if (level !== 'all' && (c.level || 'beginner') !== level) return false;
      return true;
    });

    return [...filtered].sort(
      (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || byNewest(a, b),
    );
  }, [courses, bundles, showingBundles, category, level]);

  // Changing a filter starts the count again. Keeping the old one would show
  // four rows of a two-item result, or hide the top of a longer one.
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [category, level]);

  const onScreen = visible.slice(0, shown);

  return (
    <section className={`courses-browse hm-band--light${inView ? ' is-in' : ''}`} data-audience={audience}>
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
            /* A masked span rather than an <img>: the artwork is white-on-
               transparent, drawn for the dark ground this page used to have, so
               as an image it cannot take a colour. Masked, it is a shape the
               CSS fills — see CoursesBrowser.css. */
            icon={<span className="courses-filter__img courses-filter__img--menu" />}
            heading="Categories"
            name="category"
            options={CATEGORY_OPTS}
            value={category}
            onChange={setCategory}
          />
          {/* Hidden under Bundles: a bundle has no level, so leaving the group
              there would be a control that does nothing to what is on screen. */}
          {showingBundles ? null : (
            <FilterGroup
              icon={<span className="courses-filter__img courses-filter__img--level" />}
              heading="Level"
              name="level"
              options={LEVEL_OPTS}
              value={level}
              onChange={setLevel}
            />
          )}
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

          {status === 'loading' && <p className="courses-main__title">Loading courses…</p>}
          {status === 'error' && (
            <p className="courses-main__title">
              We couldn&apos;t load the courses right now. Please try again shortly.
            </p>
          )}
          {status === 'ready' && visible.length === 0 && (
            <p className="courses-main__title">
              {showingBundles
                ? 'No bundles have been published yet.'
                : courses.length === 0
                  ? 'No courses have been published yet.'
                  : 'No resources match these filters.'}
            </p>
          )}

          {status === 'ready' && visible.length > 0 && (
            <ul className="courses-grid">
              {onScreen.map((item, i) =>
                showingBundles ? (
                  <li key={item._id || item.id} className="courses-card" style={{ '--i': i % PAGE_SIZE }}>
                    <Link className="courses-card__link" to={`/bundles/${item.slug}`}>
                      <div
                        className="courses-card__art"
                        style={
                          item.image?.url
                            ? { backgroundImage: `url(${item.image.url})` }
                            : undefined
                        }
                      />
                      <div className="courses-card__body">
                        <div className="courses-card__tags">
                          <span className="courses-tag">
                            {item.courseCount} {item.courseCount === 1 ? 'course' : 'courses'}
                          </span>
                          {/* The saving is the reason a bundle exists, so it is
                              on the card rather than a click away. */}
                          {item.saving > 0 && (
                            <span className="courses-card__level">
                              Save {formatPrice(item.saving, item.currency)}
                            </span>
                          )}
                        </div>
                        <h3 className="courses-card__title">{item.title}</h3>
                        <p className="courses-card__price">
                          {formatPrice(item.price, item.currency)}
                          {item.listPrice > item.price && (
                            <s>{formatPrice(item.listPrice, item.currency)}</s>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ) : (
                  <li key={item._id || item.id} className="courses-card" style={{ '--i': i % PAGE_SIZE }}>
                    <Link className="courses-card__link" to={`/courses/${item.slug}`}>
                      <div
                        className="courses-card__art"
                        style={
                          item.image?.url
                            ? { backgroundImage: `url(${item.image.url})` }
                            : undefined
                        }
                      />
                      <div className="courses-card__body">
                        <div className="courses-card__tags">
                          {item.availability && (
                            <span className="courses-tag">
                              {AVAILABILITY_LABEL[item.availability] || item.availability}
                            </span>
                          )}
                          {item.durationLabel && (
                            <span className="courses-card__level">{item.durationLabel}</span>
                          )}
                        </div>
                        {/* Title only — the summary belongs on the course's own
                            page, not on the card. */}
                        <h3 className="courses-card__title">{item.title}</h3>
                      </div>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}

          {/* Past four rows the grid stops being something you scan and starts
              being something you scroll past, so the rest waits behind a button
              — the same rule the insights grid follows. */}
          {status === 'ready' && visible.length > shown && (
            <button
              type="button"
              className="courses-main__more"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
            >
              View more
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
