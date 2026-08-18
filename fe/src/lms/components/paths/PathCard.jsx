import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import ProgressBar from '../progress/ProgressBar.jsx';

// A learning path in the list (L4).
export default function PathCard({ path }) {
  const next = path.steps.find((s) => s.state === 'current');

  return (
    <article className="lms-course lms-path-card">
      <Link
        to={`/learn/paths/${path.slug}`}
        className={`lms-course__cover is-accent-${path.accent % 6}`}
        aria-label={path.title}
      >
        <span className="lms-course__level">
          <LmsIcon name="path" />
          Learning path
        </span>
        {path.complete ? (
          <span className="lms-pill lms-course__status is-completed">Complete</span>
        ) : null}
      </Link>

      <div className="lms-course__body">
        <h3 className="lms-course__title">
          <Link to={`/learn/paths/${path.slug}`}>{path.title}</Link>
        </h3>
        <p className="lms-course__summary">{path.summary}</p>

        <ul className="lms-course__meta">
          <li><LmsIcon name="book" /> {path.steps.length} courses</li>
          <li><LmsIcon name="award" /> {path.certificateTitle}</li>
        </ul>

        <ProgressBar
          percent={path.percent}
          complete={path.complete}
          left={
            <>
              <strong>{path.doneCount}</strong> of {path.steps.length} courses
            </>
          }
          right={<strong>{path.percent}%</strong>}
        />

        {next ? (
          <div className="lms-course__next">
            <LmsIcon name="play" className="lms-course__next-icon" />
            <span className="lms-course__next-body">
              <span className="lms-course__next-label">Up next</span>
              <span className="lms-course__next-title">{next.course.title}</span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="lms-course__foot">
        <Link className="lms-btn lms-btn--sm lms-btn--primary" to={`/learn/paths/${path.slug}`}>
          View path
        </Link>
      </div>
    </article>
  );
}
