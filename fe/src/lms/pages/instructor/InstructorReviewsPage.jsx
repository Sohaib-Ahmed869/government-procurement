import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import RatingStars from '../../components/community/RatingStars.jsx';
import { useInstructorReviews } from '../../hooks/useReviews.js';

function on(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

// Anything at or below this is worth reading before the praise is.
const POOR = 3;

// Reviews (L5 / R1): what learners are saying about this instructor's courses.
//
// The SAME records the learners wrote on their own Reviews page. Read-only
// here on purpose — an author who could edit or remove their own reviews would
// make every rating on the site worthless.
export default function InstructorReviewsPage() {
  const { reviews, courses, totals, status, error } = useInstructorReviews();
  const [courseFilter, setCourseFilter] = useState('all');
  const [onlyPoor, setOnlyPoor] = useState(false);

  const visible = useMemo(
    () => reviews.filter((r) => {
      if (courseFilter !== 'all' && r.slug !== courseFilter) return false;
      if (onlyPoor && r.rating > POOR) return false;
      return true;
    }),
    [reviews, courseFilter, onlyPoor],
  );

  const head = (
    <div className="lms-page__head">
      <div>
        <h1 className="lms-page__title">Reviews</h1>
        <p className="lms-page__subtitle">
          What learners are saying about your courses.
        </p>
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div>
        {head}
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '40%', height: 22 }} />
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

  if (!courses.length) {
    return (
      <div>
        {head}
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="star" className="lms-blank__icon" />
            <h2>No courses yet</h2>
            <p>Build and publish a course. Once learners are halfway through it, they can review it.</p>
            <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses">
              <LmsIcon name="book" />
              My courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const poorCount = reviews.filter((r) => r.rating <= POOR).length;

  return (
    <div>
      {head}

      <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <span className="lms-stat is-static">
          <span className="lms-stat__icon"><LmsIcon name="star" /></span>
          <span>
            <span className="lms-stat__label">Average rating</span>
            <span className="lms-stat__value">{totals.average ?? '—'}</span>
            <span className="lms-stat__hint">
              {totals.count ? `across ${totals.count} review${totals.count === 1 ? '' : 's'}` : 'no reviews yet'}
            </span>
          </span>
        </span>
        <span className="lms-stat is-static">
          <span className="lms-stat__icon"><LmsIcon name="chat" /></span>
          <span>
            <span className="lms-stat__label">Reviews</span>
            <span className="lms-stat__value">{totals.count ?? 0}</span>
            <span className="lms-stat__hint">
              {poorCount ? `${poorCount} at ${POOR} stars or below` : 'none below 4 stars'}
            </span>
          </span>
        </span>
        <span className="lms-stat is-static">
          <span className="lms-stat__icon"><LmsIcon name="book" /></span>
          <span>
            <span className="lms-stat__label">Courses reviewed</span>
            <span className="lms-stat__value">
              {(totals.courses ?? 0) - (totals.unreviewed ?? 0)}/{totals.courses ?? 0}
            </span>
            <span className="lms-stat__hint">
              {totals.unreviewed ? `${totals.unreviewed} with no reviews` : 'all of them'}
            </span>
          </span>
        </span>
      </div>

      {/* Per course, because "4.2 across everything" is not actionable and
          "2.1 on this one" is. */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="book" />
            By course
          </h2>
          <span className="lms-card__note">Most reviewed first, worst rated before best</span>
        </div>

        <div className="lms-dtable__scroll">
          <table className="lms-dtable">
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Rating</th>
                <th scope="col">Reviews</th>
                <th scope="col">Spread</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c._id}>
                  <td>
                    <Link className="lms-ecourse__title" to={`/learn/courses/${c.slug}`}>
                      {c.title}
                    </Link>
                  </td>
                  <td>
                    {c.count ? (
                      <span className="lms-ecourse__avg">
                        <RatingStars value={c.average} />
                        <span className="lms-roster__pct">{c.average}</span>
                      </span>
                    ) : (
                      <span className="lms-roster__sub">Not rated yet</span>
                    )}
                  </td>
                  <td><span className="lms-ecourse__num">{c.count}</span></td>
                  <td>
                    {c.count ? (
                      // Five bars beat an average: a 4.0 of straight fours and
                      // a 4.0 of fives and ones are different courses.
                      <span className="lms-spread">
                        {[5, 4, 3, 2, 1].map((n) => (
                          <span className="lms-spread__row" key={n}>
                            <span className="lms-spread__n">{n}</span>
                            <span className="lms-spread__bar">
                              <span
                                className="lms-spread__fill"
                                style={{ width: `${Math.round(((c.spread?.[n] ?? 0) / c.count) * 100)}%` }}
                              />
                            </span>
                            <span className="lms-spread__c">{c.spread?.[n] ?? 0}</span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="lms-roster__sub">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="chat" />
            What they wrote
          </h2>
          <div className="lms-filters__right">
            <label className="lms-check" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={onlyPoor}
                onChange={(e) => setOnlyPoor(e.target.checked)}
              />
              <span>{POOR} stars and below</span>
            </label>
            <label className="lms-sort">
              <span className="lms-sr-only">Filter by course</span>
              <select
                className="lms-select"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                <option value="all">All courses</option>
                {courses.map((c) => (
                  <option key={c._id} value={c.slug}>{c.title}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="lms-empty">
            {reviews.length
              ? 'Nothing matches those filters.'
              : 'Nobody has reviewed your courses yet. Learners can review a course once they’re halfway through it.'}
          </p>
        ) : (
          <ul className="lms-reviews">
            {visible.map((r) => (
              <li className="lms-review" key={r.id}>
                <div className="lms-review__head">
                  <div>
                    <Link className="lms-review__course" to={`/learn/courses/${r.slug}`}>
                      {r.courseTitle}
                    </Link>
                    <div className="lms-review__rating">
                      <RatingStars value={r.rating} />
                      <span className="lms-review__date">
                        {r.updatedAt !== r.createdAt ? 'Edited ' : ''}
                        {on(r.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <span className="lms-roster__who">
                    <span className="lms-avatar" aria-hidden="true">{initials(r.author)}</span>
                    <span className="lms-roster__name">{r.author}</span>
                  </span>
                </div>

                {r.title ? <h3 className="lms-review__title">{r.title}</h3> : null}
                {r.body ? <p className="lms-review__body">{r.body}</p> : null}
                {!r.title && !r.body ? (
                  <p className="lms-review__body lms-review__body--empty">
                    <LmsIcon name="star" />
                    Rating only, no written review.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
