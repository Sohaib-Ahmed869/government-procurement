import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { gateIcon, gateLabel, isLocked } from '../../utils/gating.js';
import { lessonHref } from '../../utils/lessonHref.js';


function mins(n) {
  return n >= 60 ? `${Math.floor(n / 60)}h ${n % 60}m` : `${n}m`;
}

// One lesson inside a module. Three states: open (a link), locked (a static row
// carrying its reason), or complete (a link with a tick).
export default function LessonRow({ slug, lesson }) {
  const locked = isLocked(lesson.gate);
  const openable = !locked || lesson.preview;

  const inner = (
    <>
      <span className="lms-lesson__state">
        {lesson.complete ? (
          <LmsIcon name="check" className="lms-lesson__tick" />
        ) : locked ? (
          <LmsIcon name={gateIcon(lesson.gate)} className="lms-lesson__lock" />
        ) : (
          <LmsIcon name={lesson.kind} className="lms-lesson__kind" />
        )}
      </span>

      <span className="lms-lesson__body">
        <span className="lms-lesson__title">{lesson.title}</span>
        {locked ? <span className="lms-lesson__note">{gateLabel(lesson.gate)}</span> : null}
      </span>

      {lesson.preview && !lesson.complete ? (
        <span className="lms-pill lms-pill--preview">
          <LmsIcon name="eye" />
          Free preview
        </span>
      ) : null}
      {lesson.current ? <span className="lms-pill lms-pill--current">Up next</span> : null}

      <span className="lms-lesson__time">{mins(lesson.minutes)}</span>
    </>
  );

  const className = `lms-lesson${lesson.complete ? ' is-complete' : ''}${
    locked && !lesson.preview ? ' is-locked' : ''
  }${lesson.current ? ' is-current' : ''}`;

  if (!openable) {
    return (
      <li className={className} aria-disabled="true">
        {inner}
      </li>
    );
  }

  return (
    <li className={className}>
      <Link to={lessonHref(slug, lesson)} className="lms-lesson__link">
        {inner}
      </Link>
    </li>
  );
}
