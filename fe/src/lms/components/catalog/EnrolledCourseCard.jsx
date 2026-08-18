import { Link } from 'react-router-dom';
import ProgressBar from '../progress/ProgressBar.jsx';
import { gateIcon, gateLabel, gateShortLabel, isLocked } from '../../utils/gating.js';
import { courseStatus, coursePercent } from '../../hooks/useMyCourses.js';
import { lessonHref } from '../../utils/lessonHref.js';

const ICONS = {
  video: <><rect x="2" y="5" width="14" height="14" rx="2.5" /><path d="m16 10 6-3v10l-6-3z" /></>,
  text: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  quiz: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9.5 12.5a1.6 1.6 0 0 1 3 .6c0 1.1-1.5 1.3-1.5 2.2" /><path d="M11 18h.01" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  award: <><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8.5 6 3.5-6 3.5z" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  path: <><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M9 6h6a3 3 0 0 1 3 3v6" /></>,
  modules: <><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="11" height="6" rx="1.5" /></>,
  lessons: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>,
};

function Icon({ name, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] || ICONS.text}
    </svg>
  );
}

function duration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const STATUS_LABEL = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

// One enrolled course. Carries the requirement surface a learner needs at a
// glance: structure (L1. Modules and lessons), completion (L3), the next step
// with its lock reason (L4 drip / prerequisites) and the certificate once the
// course is finished (L4).
export default function EnrolledCourseCard({ course }) {
  const status = courseStatus(course);
  const percent = coursePercent(course);
  const locked = isLocked(course.next?.gate);
  const lockText = gateLabel(course.next?.gate);
  const done = status === 'completed';

  // Where the primary action goes, decided by the one helper every lesson link
  // in the LMS uses. This card used to have its own copy, which knew about
  // video and quizzes but not YouTube or documents.
  const nextHref = lessonHref(course.slug, course.next);

  return (
    <article className="lms-course">
      <Link
        to={`/learn/courses/${course.slug}`}
        className={`lms-course__cover is-accent-${course.accent % 6}`}
        aria-label={course.title}
      >
        <span className="lms-course__level">{course.levelLabel}</span>
        <span className={`lms-pill lms-course__status is-${status}`}>{STATUS_LABEL[status]}</span>
        {done && course.certificate ? (
          <span className="lms-course__ribbon">
            <Icon name="award" />
            Certificate earned
          </span>
        ) : null}
      </Link>

      <div className="lms-course__body">
        {course.path ? (
          <span className="lms-course__path">
            <Icon name="path" />
            {course.path}
          </span>
        ) : null}

        <h3 className="lms-course__title">
          <Link to={`/learn/courses/${course.slug}`}>{course.title}</Link>
        </h3>
        <p className="lms-course__by">{course.instructor.name}</p>

        {/* Their access is intact, so this is a note rather than a warning,
            but the card shouldn't look identical to a course still on sale. */}
        {course.offline ? (
          <p className="lms-course__offline">
            <Icon name="lock" />
            Off the site, still yours
          </p>
        ) : null}

        <ul className="lms-course__meta">
          <li><Icon name="modules" /> {course.modules ?? 0} modules</li>
          <li><Icon name="lessons" /> {course.lessons ?? 0} lessons</li>
          {/* "- left" on a finished course reads as missing data, so the
              remaining-time item gives way to the completion instead. */}
          {done ? (
            <li><Icon name="check" /> Complete</li>
          ) : (
            <li><Icon name="clock" /> {duration(course.minutesLeft)} left</li>
          )}
        </ul>

        <ProgressBar
          percent={percent}
          complete={done}
          left={
            <>
              <strong>{course.lessonsDone}</strong> of {course.lessons} lessons
            </>
          }
          right={<strong>{percent}%</strong>}
        />

        {/* Next step, or why it isn't available yet. */}
        {course.next ? (
          <div className={`lms-course__next${locked ? ' is-locked' : ''}`}>
            <Icon name={locked ? gateIcon(course.next.gate) : course.next.kind} className="lms-course__next-icon" />
            <span className="lms-course__next-body">
              <span className="lms-course__next-label">{locked ? 'Locked' : 'Up next'}</span>
              {/* When it's locked the reason matters more than the lesson name,
                  the learner can't open it either way. */}
              <span className="lms-course__next-title">
                {locked ? lockText : course.next.title}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="lms-course__foot">
        {done ? (
          <>
            <Link className="lms-btn lms-btn--sm" to={`/learn/courses/${course.slug}`}>
              Review course
            </Link>
            {course.certificate ? (
              <Link
                className="lms-btn lms-btn--sm lms-btn--mint"
                to={`/learn/certificates/${course.certificate.id}`}
              >
                <Icon name="award" />
                Certificate
              </Link>
            ) : null}
          </>
        ) : locked ? (
          <>
            <button type="button" className="lms-btn lms-btn--sm" disabled title={lockText}>
              <Icon name={gateIcon(course.next.gate)} />
              {gateShortLabel(course.next.gate)}
            </button>
            <Link className="lms-btn lms-btn--sm lms-btn--ghost" to={`/learn/courses/${course.slug}`}>
              View outline
            </Link>
          </>
        ) : (
          <>
            <Link className="lms-btn lms-btn--sm lms-btn--primary" to={nextHref}>
              <Icon name="play" />
              {course.lessonsDone > 0 ? 'Resume' : 'Start course'}
            </Link>
            <Link className="lms-btn lms-btn--sm lms-btn--ghost" to={`/learn/courses/${course.slug}`}>
              View outline
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
