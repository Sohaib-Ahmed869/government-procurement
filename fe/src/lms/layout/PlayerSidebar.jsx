import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../components/LmsIcon.jsx';
import { isLocked } from '../utils/gating.js';
import { lessonHref } from '../utils/lessonHref.js';

// What a lesson row's kicker says it is. Uploaded video and a YouTube embed are
// two screens but one promise to the learner — "watch this" — so they share a
// label, exactly as they share the /watch route.
const KIND_LABEL = {
  video: 'Video',
  youtube: 'Video',
  doc: 'Document',
  quiz: 'Quiz',
  text: 'Reading',
};

const KIND_ICON = {
  video: 'play',
  youtube: 'play',
  doc: 'doc',
  quiz: 'quiz',
  text: 'text',
};

function kicker(lesson) {
  const label = KIND_LABEL[lesson.kind] ?? 'Reading';
  return lesson.minutes ? `${label} | ${lesson.minutes}m` : label;
}

function pct(done, total) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

// The curriculum rail inside the player: where the course is up to, then the
// modules, then the lessons inside them.
//
// Modules collapse. It used to be flat on the reasoning that you want to see
// where you are rather than manage an accordion — true of a three-lesson
// course, and the thing that made a twelve-module one a scroll. The module
// holding the lesson you're on is opened for you and stays open, so the rail
// still lands you where you are without being asked.
export default function PlayerSidebar({ course, modules, enrolment, activeId, onNavigate }) {
  const { slug } = useParams();

  // The module the learner is actually in. Falls back to the first, so a
  // screen with no lesson of its own still opens the rail somewhere useful.
  const activeModId =
    modules.find((m) => m.lessons.some((l) => l.id === activeId))?.id ?? modules[0]?.id;

  const [open, setOpen] = useState(() => new Set(activeModId ? [activeModId] : []));

  // Moving to a lesson in a collapsed module opens it. Without this, clicking
  // "Next" into the following module left the rail pointing at nothing.
  useEffect(() => {
    if (!activeModId) return;
    setOpen((current) => (current.has(activeModId) ? current : new Set(current).add(activeModId)));
  }, [activeModId]);

  const toggle = useCallback((id) => {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const totalLessons = course.lessons || modules.reduce((s, m) => s + m.lessons.length, 0);
  // The same numbers the top bar is showing. Counting completions out of the
  // outline instead would drift from the header the moment the two disagreed.
  const lessonsDone = enrolment
    ? enrolment.lessonsDone ?? 0
    : modules.reduce((s, m) => s + m.lessons.filter((l) => l.complete).length, 0);
  const percent = pct(lessonsDone, totalLessons);
  const done = totalLessons > 0 && lessonsDone >= totalLessons;

  return (
    <aside className="lms-player__rail">
      <div className="lms-player__rail-head">
        <span className="lms-player__rail-label">Course content</span>
        <Link className="lms-player__rail-course" to={`/learn/courses/${slug}`}>
          {course.title}
        </Link>
        <p className="lms-player__rail-counts">
          {modules.length} {modules.length === 1 ? 'module' : 'modules'} | {totalLessons}{' '}
          {totalLessons === 1 ? 'lesson' : 'lessons'}
        </p>
        <span
          className="lms-progress"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            className={`lms-progress__fill${done ? ' is-complete' : ''}`}
            style={{ width: `${percent}%` }}
          />
        </span>
        <p className="lms-player__rail-progress">
          {lessonsDone}/{totalLessons} completed | {percent}%
        </p>
      </div>

      <div className="lms-player__rail-list">
        {modules.map((mod) => {
          const modDone = mod.lessons.filter((l) => l.complete).length;
          const modPercent = pct(modDone, mod.lessons.length);
          const isOpen = open.has(mod.id);
          const panelId = `rail-mod-${mod.id}`;

          return (
            <div className={`lms-player__mod${isOpen ? ' is-open' : ''}`} key={mod.id}>
              <button
                type="button"
                className="lms-player__mod-head"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(mod.id)}
              >
                <LmsIcon name="chevron" className="lms-player__mod-chevron" />
                <span className="lms-player__mod-body">
                  <span className="lms-player__mod-label">Module {mod.order}</span>
                  <span className="lms-player__mod-title">{mod.title}</span>
                  <span className="lms-progress lms-player__mod-bar">
                    <span
                      className={`lms-progress__fill${mod.complete ? ' is-complete' : ''}`}
                      style={{ width: `${modPercent}%` }}
                    />
                  </span>
                </span>
                <span className="lms-player__mod-count">
                  {modDone}/{mod.lessons.length}
                </span>
              </button>

              <ul className="lms-player__lessons" id={panelId} hidden={!isOpen}>
                {mod.lessons.map((lesson) => {
                  const locked = isLocked(lesson.gate) && !lesson.preview;
                  const active = lesson.id === activeId;
                  const cls = `lms-player__lesson${active ? ' is-active' : ''}${
                    locked ? ' is-locked' : ''
                  }${lesson.complete ? ' is-complete' : ''}`;

                  const inner = (
                    <>
                      <LmsIcon
                        name={lesson.complete ? 'check' : locked ? 'lock' : 'circle'}
                        className="lms-player__lesson-state"
                      />
                      <span className="lms-player__lesson-body">
                        <span className="lms-player__lesson-kind">
                          <LmsIcon
                            name={KIND_ICON[lesson.kind] ?? 'text'}
                            className="lms-player__lesson-kind-icon"
                          />
                          {kicker(lesson)}
                        </span>
                        <span className="lms-player__lesson-title">{lesson.title}</span>
                      </span>
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
          );
        })}
      </div>
    </aside>
  );
}
