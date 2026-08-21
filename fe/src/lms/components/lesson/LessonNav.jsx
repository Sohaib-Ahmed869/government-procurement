import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { isLocked } from '../../utils/gating.js';
import { lessonHref } from '../../utils/lessonHref.js';


// Previous / mark-complete / next, at the foot of every lesson (L1, L3).
// Completion is what drives progress, so the primary action is the tick. The
// next-lesson link sits beside it rather than replacing it.
// `enrolled` decides whether the tick is there at all. Completion is progress
// through a course somebody has, and the server refuses it without an active
// enrolment — so on a free preview the button could only ever fail, and a
// button whose whole job is to fail should not be on the page.
export default function LessonNav({ slug, prev, next, complete, onToggleComplete, enrolled = true }) {
  const nextLocked = next ? isLocked(next.gate) : false;

  return (
    <div className="lms-lessonnav">
      {prev ? (
        <Link className="lms-btn" to={lessonHref(slug, prev)}>
          <LmsIcon name="chevron" className="lms-lessonnav__prev-icon" />
          Previous
        </Link>
      ) : (
        <span />
      )}

      <div className="lms-lessonnav__mid">
        {enrolled ? (
          <button
            type="button"
            className={`lms-btn ${complete ? 'lms-btn--mint' : 'lms-btn--primary'}`}
            onClick={onToggleComplete}
          >
            <LmsIcon name="check" />
            {complete ? 'Completed' : 'Mark as complete'}
          </button>
        ) : null}
      </div>

      {next && !nextLocked ? (
        <Link className="lms-btn" to={lessonHref(slug, next)}>
          Next
          <LmsIcon name="arrow" />
        </Link>
      ) : next ? (
        <button type="button" className="lms-btn" disabled title="This lesson isn't available yet">
          <LmsIcon name="lock" />
          Next
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
