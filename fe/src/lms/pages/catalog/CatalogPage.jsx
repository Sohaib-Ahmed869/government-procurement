import { useMemo, useState } from 'react';
import CatalogFilters from '../../components/catalog/CatalogFilters.jsx';
import CatalogCourseCard from '../../components/catalog/CatalogCourseCard.jsx';
import BundleCard from '../../components/commerce/BundleCard.jsx';
import { useCatalog } from '../../hooks/useCatalog.js';

// Segments mirror the existing Course model's own taxonomy (level / segment /
// resourceType), so the LMS filters and the public site's filters stay in step.
const LEVELS = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'title', label: 'Title (A–Z)' },
];

function Skeletons({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div className="lms-course lms-course--skeleton" key={i} aria-hidden="true">
          <div className="lms-course__cover" />
          <div className="lms-course__body">
            <span className="lms-skel lms-skel--line" style={{ width: '82%' }} />
            <span className="lms-skel lms-skel--line" style={{ width: '54%' }} />
            <span className="lms-skel lms-skel--bar" />
          </div>
        </div>
      ))}
    </>
  );
}

// Browse Catalogue (C2). Everything on offer, including courses the learner is
// already enrolled in, marked as such rather than hidden.
export default function CatalogPage() {
  const { courses, bundles, status, error } = useCatalog();
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [freeOnly, setFreeOnly] = useState(false);

  const counts = useMemo(() => {
    const c = { all: courses.length, beginner: 0, intermediate: 0, advanced: 0 };
    courses.forEach((course) => {
      if (c[course.level] !== undefined) c[course.level] += 1;
    });
    return c;
  }, [courses]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = courses.filter((course) => {
      if (level !== 'all' && course.level !== level) return false;
      if (freeOnly && course.price > 0) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        (course.summary ?? '').toLowerCase().includes(q) ||
        (course.instructor?.name ?? '').toLowerCase().includes(q)
      );
    });

    // Ratings and learner counts are null until those are tracked, and null in
    // a comparator produces NaN, which leaves the order arbitrary. Missing
    // values sort last and ties fall back to the title, so the grid is stable.
    const rank = (v) => (typeof v === 'number' ? v : -Infinity);
    const byTitle = (a, b) => a.title.localeCompare(b.title);

    const sorted = [...filtered];
    if (sort === 'rating') sorted.sort((a, b) => rank(b.rating) - rank(a.rating) || byTitle(a, b));
    else if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price || byTitle(a, b));
    else if (sort === 'title') sorted.sort(byTitle);
    else sorted.sort((a, b) => rank(b.learners) - rank(a.learners) || byTitle(a, b));
    return sorted;
  }, [courses, level, query, sort, freeOnly]);

  const tabs = LEVELS.map((l) => ({ ...l, count: counts[l.value] }));

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Browse Catalogue</h1>
          <p className="lms-page__subtitle">
            Courses, workshops and programs across Australian government procurement.
          </p>
        </div>
        <div className="lms-page__actions">
          <label className="lms-check">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
            />
            <span>Free only</span>
          </label>
        </div>
      </div>

      <CatalogFilters
        tabs={tabs}
        active={level}
        onTabChange={setLevel}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        sortOptions={SORTS}
      />

      {/* Distinct from "no matches": a failed request is not an empty
          catalogue, and telling someone to change their filters when the
          server is down sends them looking in the wrong place. */}
      {status === 'error' ? (
        <div className="lms-card">
          <p className="lms-empty">{error || 'We couldn’t load the catalogue. Try again shortly.'}</p>
        </div>
      ) : (
        <div className="lms-course-grid">
          {status === 'loading' ? (
            <Skeletons />
          ) : visible.length === 0 ? (
            <div className="lms-card lms-course-grid__empty">
              <p className="lms-empty">
                {query.trim()
                  ? `No courses match “${query.trim()}”.`
                  : 'Nothing matches those filters yet.'}
              </p>
            </div>
          ) : (
            visible.map((course) => <CatalogCourseCard key={course.id} course={course} />)
          )}
        </div>
      )}

      {/* Bundles below the courses, in their own band. Mixed into the same grid
          they would be filtered and sorted by controls that mean nothing for a
          bundle — there is no level to filter a bundle by, and "free only"
          would silently hide every one of them. */}
      {status === 'ready' && bundles.length ? (
        <section className="lms-bundles">
          <div className="lms-bundles__head">
            <h2 className="lms-section-title">Bundles</h2>
            <p className="lms-bundles__note">
              Several courses at one price, cheaper than buying them separately.
            </p>
          </div>
          <div className="lms-bundles__grid">
            {bundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
