import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import LessonBody from '../../components/lesson/LessonBody.jsx';
import LessonNav from '../../components/lesson/LessonNav.jsx';
import ResourceList from '../../components/lesson/ResourceList.jsx';
import NoteEditor from '../../components/progress/NoteEditor.jsx';
import BookmarkButton from '../../components/progress/BookmarkButton.jsx';
import LessonStates from '../../components/lesson/LessonStates.jsx';
import PreviewGate from '../../components/lesson/PreviewGate.jsx';
import { useLesson } from '../../hooks/useLesson.js';
import { lessonHref } from '../../utils/lessonHref.js';

// A text lesson (L1): the body, its downloadable resources, the learner's notes
// and bookmark, and completion. Renders inside PlayerLayout, so the curriculum
// rail and the exit route are already on screen.
export default function LessonPage() {
  const { slug, lessonId } = useParams();
  const { data, status, gate, error, complete, markComplete, reload } = useLesson(slug, lessonId);

  const [tab, setTab] = useState('resources'); // resources | notes

  // Reset the per-lesson UI when navigating between lessons.
  useEffect(() => {
    setTab('resources');
  }, [lessonId]);

  if (status !== 'ready') {
    return (
      <LessonStates slug={slug} status={status} gate={gate} error={error} onRetry={reload} />
    );
  }

  const { course, lesson, module: mod, index, total, prev, next, body, resources, enrolled } = data;

  // This route renders TEXT lessons. A video, an embed, a document or a quiz
  // has its own screen, and landing here would tell the learner their video
  // lesson "doesn't have any written content yet" — which is true, and useless.
  //
  // Links inside the app now all go through lessonHref(), so this is for the
  // ones that don't come from inside it: a bookmark saved before a lesson's
  // kind was changed, a link someone pasted, a stale tab. Cheaper than leaving
  // any of those on a page that quietly shows the wrong thing.
  //
  // The preview route used to be exempt, back when this was the only in-course
  // screen that worked signed out — so a preview video rendered here and was
  // told it had no written content. The preview family now has a screen per
  // kind, so the redirect applies there too and lessonHref() sends it to the
  // preview URL rather than the enrolled one.
  if (lesson.kind && lesson.kind !== 'text') {
    return <Navigate to={lessonHref(slug, lesson)} replace />;
  }

  return (
    <div className="lms-lesson-page">
      <div className="lms-lesson-page__head">
        <span className="lms-lesson-page__crumb">
          Module {mod.order} · {mod.title} · Lesson {index + 1} of {total}
        </span>
        <h1 className="lms-lesson-page__title">{lesson.title}</h1>
        <div className="lms-lesson-page__meta">
          <span><LmsIcon name="clock" /> {lesson.minutes} min read</span>
          {lesson.preview ? (
            <span className="lms-pill lms-pill--preview">
              <LmsIcon name="eye" />
              Free preview
            </span>
          ) : null}
          {/* A bookmark is a place in a course you are working through. There
              is nothing to come back to before you have the course. */}
          {enrolled ? <BookmarkButton slug={slug} lessonId={lesson.id} /> : null}
        </div>
      </div>

      <article className="lms-card lms-lesson-page__body">
        {body.length ? (
          <LessonBody blocks={body} />
        ) : (
          <p className="lms-empty">
            This lesson doesn’t have any written content yet.
          </p>
        )}
      </article>

      {/* Directly under the body, where somebody who has just finished reading
          the sample actually is. */}
      <PreviewGate course={course} lesson={lesson} enrolled={enrolled} />

      <LessonNav
        slug={slug}
        prev={prev}
        next={next}
        complete={complete}
        onToggleComplete={markComplete}
        enrolled={enrolled}
      />

      {/* Resources and notes sit under the lesson rather than in a sidebar, so
          the reading column keeps a comfortable measure. */}
      <div className="lms-card lms-lesson-page__aside">
        <div className="lms-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'resources'}
            className={`lms-tab${tab === 'resources' ? ' is-active' : ''}`}
            onClick={() => setTab('resources')}
          >
            <LmsIcon name="download" />
            Resources
          </button>
          {enrolled ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'notes'}
              className={`lms-tab${tab === 'notes' ? ' is-active' : ''}`}
              onClick={() => setTab('notes')}
            >
              <LmsIcon name="note" />
              My notes
            </button>
          ) : null}
        </div>

        <div className="lms-tabs__panel">
          {tab === 'resources' || !enrolled ? (
            <ResourceList resources={resources} enrolled={enrolled} />
          ) : (
            <NoteEditor slug={slug} lessonId={lesson.id} />
          )}
        </div>
      </div>
    </div>
  );
}
