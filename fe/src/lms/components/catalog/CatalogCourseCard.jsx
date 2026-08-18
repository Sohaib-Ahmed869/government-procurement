import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import PriceTag from './PriceTag.jsx';
import EnrollButton from './EnrollButton.jsx';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';

// A course as it appears while browsing (C2). Distinct from EnrolledCourseCard:
// this one sells. Rating, learner count, price. Where that one tracks
// progress. Already-enrolled courses get a marker so the catalogue doesn't try
// to sell someone something they own.
export default function CatalogCourseCard({ course }) {
  const { isAuthenticated } = useStudentAuth();
  const enrolled = course.enrolled && isAuthenticated;

  return (
    <article className="lms-course lms-course--catalog">
      <Link
        to={`/learn/courses/${course.slug}`}
        className={`lms-course__cover is-accent-${course.accent % 6}`}
        aria-label={course.title}
      >
        <span className="lms-course__level">{course.levelLabel}</span>
        {enrolled ? (
          <span className="lms-pill lms-course__status is-completed">Enrolled</span>
        ) : course.featured ? (
          <span className="lms-pill lms-course__status is-not-started">Featured</span>
        ) : null}
      </Link>

      <div className="lms-course__body">
        <h3 className="lms-course__title">
          <Link to={`/learn/courses/${course.slug}`}>{course.title}</Link>
        </h3>
        <p className="lms-course__by">{course.instructor.name}</p>
        <p className="lms-course__summary">{course.summary}</p>

        {/* Ratings and learner counts aren't tracked yet, so they arrive null.
            The row is dropped rather than shown as "0.0 (0)", which reads as a
            badly-reviewed course rather than an unrated one. */}
        {course.rating != null || course.learners != null ? (
          <div className="lms-course__rating">
            {course.rating != null ? (
              <>
                <LmsIcon name="star" className="lms-course__star" />
                <strong>{course.rating.toFixed(1)}</strong>
                <span>({course.ratingCount})</span>
              </>
            ) : null}
            {course.rating != null && course.learners != null ? (
              <span className="lms-course__dot" aria-hidden="true">·</span>
            ) : null}
            {course.learners != null ? (
              <span>{course.learners.toLocaleString('en-AU')} learners</span>
            ) : null}
          </div>
        ) : null}

        <ul className="lms-course__meta">
          {course.modules != null ? (
            <li><LmsIcon name="modules" /> {course.modules} modules</li>
          ) : null}
          {course.lessons != null ? (
            <li><LmsIcon name="lessons" /> {course.lessons} lessons</li>
          ) : null}
          {course.durationLabel ? (
            <li><LmsIcon name="clock" /> {course.durationLabel}</li>
          ) : null}
        </ul>
      </div>

      <div className="lms-course__foot">
        <PriceTag price={course.price} currency={course.currency} />
        <div className="lms-course__foot-actions">
          <EnrollButton course={course} size="sm" />
        </div>
      </div>
    </article>
  );
}
