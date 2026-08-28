import { useCallback, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import LmsIcon from '../components/LmsIcon.jsx';
import PlayerSidebar from './PlayerSidebar.jsx';
import { useCourseOutline } from '../hooks/useCourseOutline.js';
import '../lms.css';

// The distraction-free shell every in-course screen renders inside: lessons,
// the video player and the quiz runner. Deliberately not LmsLayout, while a
// learner is working through content, the app nav is noise, so this trades it
// for the curriculum and a way back out.
//
// Child screens read the course themselves via useCourseOutline (cheap while
// it's placeholder data, and one request once it's an API call with a cache).
export default function PlayerLayout() {
  const { slug, lessonId, quizId } = useParams();
  const { data, status, reload } = useCourseOutline(slug);
  const [railOpen, setRailOpen] = useState(false);

  const closeRail = useCallback(() => setRailOpen(false), []);

  if (status === 'loading') {
    return <div className="lms lms-scale lms-loading">Loading…</div>;
  }

  if (status === 'notfound') {
    return (
      <div className="lms lms-scale">
        <div className="lms-content">
          <h1 className="lms-page__title">Course not found</h1>
          <Link className="lms-btn lms-btn--primary" to="/learn/courses">
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  const { course, enrolment, modules } = data;
  const percent = enrolment
    ? Math.round((enrolment.lessonsDone / course.lessons) * 100)
    : 0;

  return (
    <div className="lms lms-scale">
      <div className={`lms-player${railOpen ? ' is-rail-open' : ''}`}>
        <header className="lms-player__bar">
          <Link className="lms-player__back" to={`/learn/courses/${slug}`}>
            <LmsIcon name="chevron" className="lms-player__back-icon" />
            <span>Course overview</span>
          </Link>

          <span className="lms-player__bar-title">{course.title}</span>

          <div className="lms-player__bar-right">
            {enrolment ? (
              <span className="lms-player__bar-progress" title={`${percent}% complete`}>
                <span className="lms-progress" style={{ width: 110 }}>
                  <span className="lms-progress__fill" style={{ width: `${percent}%` }} />
                </span>
                <span>{percent}%</span>
              </span>
            ) : (
              <span className="lms-pill lms-pill--preview">
                <LmsIcon name="eye" />
                Preview
              </span>
            )}
            <button
              type="button"
              className="lms-header__iconbtn lms-player__rail-toggle"
              onClick={() => setRailOpen((v) => !v)}
              aria-label={railOpen ? 'Hide course content' : 'Show course content'}
            >
              <LmsIcon name="modules" />
            </button>
            <Link className="lms-header__iconbtn" to="/learn" title="Exit to dashboard" aria-label="Exit to dashboard">
              <LmsIcon name="arrow" />
            </Link>
          </div>
        </header>

        <div className="lms-player__body">
          <main className="lms-player__main">
            {/* `reloadOutline` is what keeps the header percentage and the
                rail's ticks honest. This layout fetches the outline once on
                mount; a lesson marked complete inside a child screen changed
                nothing out here, so a two-lesson course sat at 50% after both
                were finished. The child calls this when progress moves. */}
            <Outlet
              context={{
                course,
                enrolment,
                modules,
                activeId: lessonId ?? quizId,
                reloadOutline: reload,
              }}
            />
          </main>
          <PlayerSidebar
            course={course}
            modules={modules}
            activeId={lessonId ?? quizId}
            onNavigate={closeRail}
          />
        </div>

        <div
          className="lms-player__backdrop"
          hidden={!railOpen}
          onClick={closeRail}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
