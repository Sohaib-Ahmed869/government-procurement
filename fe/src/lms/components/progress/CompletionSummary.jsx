import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import ProgressBar from './ProgressBar.jsx';
import SegmentBar from './SegmentBar.jsx';

function duration(minutes) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Per-course completion (L3), expandable to the module breakdown. Collapsed by
// default. Six courses' worth of modules open at once is a wall, and the
// course-level bar is what most visits are here for.
function CourseRow({ course }) {
  const [open, setOpen] = useState(false);
  const panelId = `prog-${course.slug}`;

  return (
    <div className={`lms-progrow${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="lms-progrow__head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <LmsIcon name="chevron" className="lms-progrow__chevron" />
        <span className="lms-progrow__body">
          <span className="lms-progrow__title">{course.title}</span>
          <span className="lms-progrow__meta">
            {course.lessonsDone} of {course.lessonsTotal} lessons · {duration(course.minutes)} learned
          </span>
        </span>
        <span className="lms-progrow__right">
          {/* A solid bar at course level. Ten segments here would be tenths of
              a forty-lesson course — an arbitrary division that only looks
              countable. The module bars below DO count, one segment per
              lesson, which is what earns them the segmented mark. */}
          <span className="lms-progrow__bar">
            <ProgressBar percent={course.percent} complete={course.complete} />
          </span>
          <span className={`lms-progrow__pct${course.complete ? ' is-complete' : ''}`}>
            {course.percent}%
          </span>
        </span>
      </button>

      <div className="lms-progrow__panel" id={panelId} hidden={!open}>
        <ul className="lms-modbars">
          {course.modules.map((mod) => (
            <li key={mod.id} className="lms-modbar">
              <span className="lms-modbar__title">
                <span className="lms-modbar__num">{mod.order}</span>
                {mod.title}
              </span>
              <span className="lms-modbar__bar">
                {/* One segment per lesson, so the bar IS the module: four lit
                    of six is read off it directly. Past eight lessons the
                    segments come out thinner than the gaps between them, and a
                    module that long falls back to a solid bar. */}
                {mod.total > 1 && mod.total <= 8 ? (
                  <SegmentBar
                    percent={mod.percent}
                    segments={mod.total}
                    tone={mod.percent === 100 ? 'done' : ''}
                    label={mod.title}
                  />
                ) : (
                  <ProgressBar percent={mod.percent} complete={mod.percent === 100} />
                )}
              </span>
              <span className="lms-modbar__count">
                {mod.done}/{mod.total}
              </span>
            </li>
          ))}
        </ul>
        <Link className="lms-btn lms-btn--sm" to={`/learn/courses/${course.slug}`}>
          Open course
        </Link>
      </div>
    </div>
  );
}

export default function CompletionSummary({ courses }) {
  if (!courses.length) {
    return <p className="lms-empty">You’re not enrolled in anything yet.</p>;
  }
  return (
    <div className="lms-progrows">
      {courses.map((c) => (
        <CourseRow key={c.slug} course={c} />
      ))}
    </div>
  );
}
