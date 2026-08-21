import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import ProgressBar from '../progress/ProgressBar.jsx';

// A learning path in the list (L4), rendered from what /lms/programs returns:
// the path document plus this learner's resolved steps. Every field here comes
// from the server, including which step is next — the browser is not the place
// to decide what somebody has finished.
export default function PathCard({ path }) {
  const steps = path.steps ?? [];
  const next = steps.find((s) => s.state === 'current');
  const accent = (path.accent ?? 0) % 6;
  const award = path.certificate?.heading || 'Certificate of Achievement';

  return (
    <article className="lms-course lms-path-card">
      <Link
        to={`/learn/paths/${path.slug}`}
        className={`lms-course__cover is-accent-${accent}`}
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
        {path.summary ? <p className="lms-course__summary">{path.summary}</p> : null}

        <ul className="lms-course__meta">
          <li><LmsIcon name="book" /> {steps.length} {steps.length === 1 ? 'course' : 'courses'}</li>
          <li><LmsIcon name="award" /> {award}</li>
        </ul>

        <ProgressBar
          percent={path.percent ?? 0}
          complete={path.complete}
          left={
            <>
              <strong>{path.doneCount ?? 0}</strong> of {steps.length} courses
            </>
          }
          right={<strong>{path.percent ?? 0}%</strong>}
        />

        {/* `next.course` can be null if a course was deleted out from under the
            path, so the card checks rather than trusting the join. */}
        {next?.course ? (
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
