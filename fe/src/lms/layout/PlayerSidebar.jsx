import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../components/LmsIcon.jsx';
import { isLocked } from '../utils/gating.js';
import { lessonHref } from '../utils/lessonHref.js';


// The curriculum rail inside the player. Flat rather than collapsible, while
// you're working through a lesson you want to see where you are, not manage an
// accordion.
export default function PlayerSidebar({ course, modules, activeId, onNavigate }) {
  const { slug } = useParams();

  return (
    <aside className="lms-player__rail">
      <div className="lms-player__rail-head">
        <span className="lms-player__rail-label">Course content</span>
        <Link className="lms-player__rail-course" to={`/learn/courses/${slug}`}>
          {course.title}
        </Link>
      </div>

      <div className="lms-player__rail-list">
        {modules.map((mod) => (
          <div className="lms-player__mod" key={mod.id}>
            <div className="lms-player__mod-head">
              <span className="lms-player__mod-label">Module {mod.order}</span>
              <span className="lms-player__mod-title">{mod.title}</span>
            </div>
            <ul className="lms-player__lessons">
              {mod.lessons.map((lesson) => {
                const locked = isLocked(lesson.gate) && !lesson.preview;
                const active = lesson.id === activeId;
                const cls = `lms-player__lesson${active ? ' is-active' : ''}${
                  locked ? ' is-locked' : ''
                }${lesson.complete ? ' is-complete' : ''}`;

                const inner = (
                  <>
                    <LmsIcon
                      name={lesson.complete ? 'check' : locked ? 'lock' : lesson.kind}
                      className="lms-player__lesson-icon"
                    />
                    <span className="lms-player__lesson-title">{lesson.title}</span>
                    <span className="lms-player__lesson-time">{lesson.minutes}m</span>
                  </>
                );

                return (
                  <li key={lesson.id}>
                    {locked ? (
                      <span className={cls} aria-disabled="true">{inner}</span>
                    ) : (
                      <Link
                        className={cls}
                        to={lessonHref(slug, lesson)}
                        onClick={onNavigate}
                        aria-current={active ? 'true' : undefined}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
