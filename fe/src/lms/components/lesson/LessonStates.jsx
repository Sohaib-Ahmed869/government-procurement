import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { gateLabel } from '../../utils/gating.js';

// The non-content states a lesson screen can be in. Shared by the text lesson
// and the video lesson so the two can't drift into describing the same
// situation differently.
//
// "Locked" is distinct from "not found" on purpose: the first tells a learner
// what to do next (enrol, or wait for the drip date), the second says the URL
// is wrong. Collapsing them would hide the actionable one.
export default function LessonStates({ slug, status, gate, error, onRetry }) {
  const back = (
    <Link className="lms-btn lms-btn--primary" to={`/learn/courses/${slug}`}>
      Back to the course
    </Link>
  );

  if (status === 'loading') {
    return (
      <div className="lms-lesson-page">
        <span className="lms-skel lms-skel--line" style={{ width: '38%', height: 14 }} />
        <span className="lms-skel lms-skel--line" style={{ width: '62%', height: 26, marginTop: 14 }} />
        <span className="lms-skel lms-skel--bar" style={{ height: 260, marginTop: 24 }} />
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="lms-lesson-page">
        <div className="lms-locked">
          <LmsIcon name="lock" className="lms-locked__icon" />
          <h1>This lesson isn’t available yet</h1>
          <p>{gateLabel(gate)}</p>
          {back}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="lms-lesson-page">
        <h1 className="lms-page__title">Couldn’t load this lesson</h1>
        <p className="lms-page__subtitle">{error}</p>
        <div className="lms-lessonnav__mid" style={{ justifyContent: 'flex-start', gap: 10 }}>
          <button type="button" className="lms-btn lms-btn--primary" onClick={onRetry}>
            Try again
          </button>
          {back}
        </div>
      </div>
    );
  }

  return (
    <div className="lms-lesson-page">
      <h1 className="lms-page__title">Lesson not found</h1>
      <p className="lms-page__subtitle">
        That lesson isn’t part of this course, or it has been removed.
      </p>
      {back}
    </div>
  );
}
