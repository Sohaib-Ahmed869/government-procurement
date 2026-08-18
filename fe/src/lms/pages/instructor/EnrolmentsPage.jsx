import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import { useEnrolmentSummary } from '../../hooks/useInstructor.js';
import { displayStatus, STATUS_LABEL } from '../../hooks/useAuthoring.js';

function when(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Enrolments (R1): one row per course, and each row opens that course's
// learners.
//
// A table rather than a grid of cards, because an instructor with thirty
// courses is the case this has to survive: cards stack into a wall you scroll
// past, while rows stay scannable and let the numbers line up in columns you
// can compare down. The roster itself is its own page for the same reason —
// expanding it inline would push everything below it off the screen.
export default function EnrolmentsPage() {
  const navigate = useNavigate();
  const { rows, totals, status, error } = useEnrolmentSummary();
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.course.title?.toLowerCase().includes(q));
  }, [rows, query]);

  const head = (
    <div className="lms-page__head">
      <div>
        <h1 className="lms-page__title">Enrolments</h1>
        <p className="lms-page__subtitle">
          Everyone learning from your courses, and how far through they are.
        </p>
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div>
        {head}
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '38%', height: 22 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div>
        {head}
        <div className="lms-card"><p className="lms-empty">{error}</p></div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div>
        {head}
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="users" className="lms-blank__icon" />
            <h2>No courses to enrol in yet</h2>
            <p>
              Build a course and get it published. Once someone enrols, they’ll show up
              here with their progress.
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses/new">
              <LmsIcon name="plus" />
              Create a course
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {head}

      <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <span className="lms-stat is-static">
          <span className="lms-stat__icon"><LmsIcon name="users" /></span>
          <span>
            <span className="lms-stat__label">Enrolments</span>
            <span className="lms-stat__value">{totals.learners.toLocaleString('en-AU')}</span>
            <span className="lms-stat__hint">
              Across {totals.withLearners} of your {totals.courses} courses
            </span>
          </span>
        </span>
        <span className="lms-stat is-static">
          <span className="lms-stat__icon"><LmsIcon name="check" /></span>
          <span>
            <span className="lms-stat__label">Completed</span>
            <span className="lms-stat__value">{totals.completed.toLocaleString('en-AU')}</span>
            <span className="lms-stat__hint">Finished every lesson</span>
          </span>
        </span>
        <Link className="lms-stat" to="/learn/instructor/courses">
          <span className="lms-stat__icon"><LmsIcon name="book" /></span>
          <span>
            <span className="lms-stat__label">Courses</span>
            <span className="lms-stat__value">{totals.courses}</span>
            <span className="lms-stat__hint">Manage them</span>
          </span>
        </Link>
      </div>

      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="book" />
            By course
          </h2>
          <span className="lms-card__note">Open a course to see who’s enrolled</span>
        </div>

        {/* Only worth offering once the list is long enough to need it. */}
        {rows.length > 6 ? (
          <div className="lms-dtable__tools">
            <label className="lms-field lms-dtable__search">
              <span className="lms-sr-only">Search courses</span>
              <input
                className="lms-input"
                value={query}
                placeholder="Search courses"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <span className="lms-dtable__count">
              {shown.length === rows.length
                ? `${rows.length} courses`
                : `${shown.length} of ${rows.length}`}
            </span>
          </div>
        ) : null}

        {shown.length === 0 ? (
          <p className="lms-empty">No course matches “{query}”.</p>
        ) : (
          <div className="lms-dtable__scroll">
            <table className="lms-dtable">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Enrolled</th>
                  <th scope="col">Completed</th>
                  <th scope="col">Average progress</th>
                  <th scope="col">Last joined</th>
                  <th scope="col"><span className="lms-sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const state = displayStatus(r.course);
                  const href = `/learn/instructor/students/${r.course._id}`;
                  return (
                    <tr
                      key={r.course._id}
                      className="is-clickable"
                      // The title is a real link, which is what a keyboard and a
                      // screen reader use. This only lets the rest of the row
                      // follow the same target.
                      onClick={() => navigate(href)}
                    >
                      <td>
                        <span className="lms-ecourse__name">
                          <span className="lms-ecourse__thumb" aria-hidden="true">
                            {r.course.image?.url ? (
                              <img src={r.course.image.url} alt="" />
                            ) : (
                              <LmsIcon name="book" />
                            )}
                          </span>
                          <span className="lms-roster__id">
                            <Link
                              className="lms-ecourse__title"
                              to={href}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.course.title}
                            </Link>
                            <span className={`lms-pill lms-status is-${state}`}>
                              {STATUS_LABEL[state] ?? 'Draft'}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="lms-ecourse__num">
                          {r.learners.toLocaleString('en-AU')}
                        </span>
                        {r.revoked ? (
                          <span className="lms-roster__sub">{r.revoked} revoked</span>
                        ) : null}
                      </td>
                      <td>
                        <span className="lms-ecourse__num">
                          {r.completed.toLocaleString('en-AU')}
                        </span>
                        <span className="lms-roster__sub">{r.lessonCount} lessons</span>
                      </td>
                      <td>
                        {r.learners ? (
                          <span className="lms-ecourse__avg">
                            <ProgressBar
                              percent={r.averagePercent}
                              complete={r.averagePercent === 100}
                            />
                            <span className="lms-roster__pct">{r.averagePercent}%</span>
                          </span>
                        ) : (
                          <span className="lms-roster__sub">
                            {state === 'published' ? 'Nobody yet' : 'Not published'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="lms-roster__date">{when(r.lastEnrolledAt)}</span>
                      </td>
                      <td>
                        <LmsIcon name="arrow" className="lms-dtable__go" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
