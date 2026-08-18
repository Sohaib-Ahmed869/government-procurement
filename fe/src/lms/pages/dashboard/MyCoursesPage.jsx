import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CatalogFilters from '../../components/catalog/CatalogFilters.jsx';
import EnrolledCourseCard from '../../components/catalog/EnrolledCourseCard.jsx';
import { useMyCourses, courseStatus, coursePercent } from '../../hooks/useMyCourses.js';

const SORTS = [
  { value: 'recent', label: 'Recently accessed' },
  { value: 'progress', label: 'Most progress' },
  { value: 'title', label: 'Title (A–Z)' },
];

const EMPTY_COPY = {
  all: 'You’re not enrolled in anything yet.',
  'in-progress': 'Nothing in progress. Start a course to see it here.',
  completed: 'No completed courses yet. Finish one to earn its certificate.',
  'not-started': 'Nothing waiting. You’ve started everything you’re enrolled in.',
};

// Card-shaped skeletons, so the grid doesn't jump when the data lands.
function Skeletons({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div className="lms-course lms-course--skeleton" key={i} aria-hidden="true">
          <div className="lms-course__cover" />
          <div className="lms-course__body">
            <span className="lms-skel lms-skel--line" style={{ width: '78%' }} />
            <span className="lms-skel lms-skel--line" style={{ width: '46%' }} />
            <span className="lms-skel lms-skel--bar" />
          </div>
        </div>
      ))}
    </>
  );
}

// My Courses (L6. The list is enrolment-scoped). Each card carries the course
// structure (L1), completion (L3), and the next step with its drip/prerequisite
// gate and any earned certificate (L4).
export default function MyCoursesPage() {
  const { courses, status } = useMyCourses();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');

  const counts = useMemo(() => {
    const c = { all: courses.length, 'in-progress': 0, completed: 0, 'not-started': 0 };
    courses.forEach((course) => {
      c[courseStatus(course)] += 1;
    });
    return c;
  }, [courses]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = courses.filter((course) => {
      if (tab !== 'all' && courseStatus(course) !== tab) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.instructor.name.toLowerCase().includes(q) ||
        (course.path ?? '').toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered];
    if (sort === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'progress') {
      sorted.sort((a, b) => coursePercent(b) - coursePercent(a));
    } else {
      // Recently accessed. Never-opened courses sort last rather than first,
      // which is where a null date would otherwise put them.
      sorted.sort((a, b) => {
        const at = a.lastAccessedAt ? Date.parse(a.lastAccessedAt) : -Infinity;
        const bt = b.lastAccessedAt ? Date.parse(b.lastAccessedAt) : -Infinity;
        return bt - at;
      });
    }
    return sorted;
  }, [courses, tab, query, sort]);

  const tabs = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'in-progress', label: 'In progress', count: counts['in-progress'] },
    { value: 'completed', label: 'Completed', count: counts.completed },
    { value: 'not-started', label: 'Not started', count: counts['not-started'] },
  ];

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">My Courses</h1>
          <p className="lms-page__subtitle">
            Everything you’re enrolled in, with your progress across each one.
          </p>
        </div>
        <div className="lms-page__actions">
          <Link className="lms-btn" to="/learn/paths">
            Learning paths
          </Link>
          <Link className="lms-btn lms-btn--primary" to="/learn/courses">
            Browse catalogue
          </Link>
        </div>
      </div>

      <CatalogFilters
        tabs={tabs}
        active={tab}
        onTabChange={setTab}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        sortOptions={SORTS}
        searchPlaceholder="Search your courses…"
      />

      {status === 'error' ? (
        <div className="lms-card">
          <p className="lms-empty">We couldn’t load your courses. Try again shortly.</p>
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
                  : EMPTY_COPY[tab]}
              </p>
              {!query.trim() && tab !== 'completed' ? (
                <div style={{ textAlign: 'center' }}>
                  <Link className="lms-btn lms-btn--primary lms-btn--sm" to="/learn/courses">
                    Browse the catalogue
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            visible.map((course) => <EnrolledCourseCard key={course.id} course={course} />)
          )}
        </div>
      )}
    </div>
  );
}
