import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import LessonNav from '../../components/lesson/LessonNav.jsx';
import NoteEditor from '../../components/progress/NoteEditor.jsx';
import ResourceList from '../../components/lesson/ResourceList.jsx';
import BookmarkButton from '../../components/progress/BookmarkButton.jsx';
import LessonStates from '../../components/lesson/LessonStates.jsx';
import { useLesson } from '../../hooks/useLesson.js';
import { videoApi } from '../../../api/lms.js';

function sizeLabel(bytes) {
  if (!bytes) return '';
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

// A documentation lesson (L1): a document to read, either uploaded here or
// linked from somewhere already public.
//
// An uploaded file is fetched through the same expiring signed URL as lesson
// video, so it is gated on enrolment. That URL is requested when the learner
// asks for it rather than on page load: a five-minute link issued at render has
// usually lapsed by the time anyone clicks it.
export default function DocLessonPage() {
  const { slug, lessonId } = useParams();
  const { data, status, gate, error, complete, markComplete, reload } = useLesson(slug, lessonId);

  const [tab, setTab] = useState('document');
  const [link, setLink] = useState(null); // { url, expiresAt }
  const [opening, setOpening] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    setTab('document');
    setLink(null);
    setLinkError('');
  }, [lessonId]);

  const doc = data?.lesson?.document;

  // Fetched on demand, then reused until it lapses.
  const fetchLink = useCallback(async () => {
    if (link && Date.parse(link.expiresAt) - Date.now() > 15_000) return link;
    const fresh = await videoApi.documentUrl(lessonId);
    setLink(fresh);
    return fresh;
  }, [link, lessonId]);

  const open = useCallback(async () => {
    setOpening(true);
    setLinkError('');
    try {
      const { url } = await fetchLink();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setLinkError(err?.message ?? 'Could not open the document.');
    } finally {
      setOpening(false);
    }
  }, [fetchLink]);

  if (status !== 'ready') {
    return <LessonStates slug={slug} status={status} gate={gate} error={error} onRetry={reload} />;
  }

  const { lesson, module: mod, index, total, prev, next } = data;
  const hasFile = Boolean(doc?.hasFile);
  const hasLink = Boolean(doc?.url);

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
          <BookmarkButton slug={slug} lessonId={lesson.id} />
        </div>
      </div>

      {doc?.summary ? (
        <article className="lms-card lms-lesson-page__body">
          <p className="lms-prose">{doc.summary}</p>
        </article>
      ) : null}

      <div className="lms-card lms-docview">
        {!hasFile && !hasLink ? (
          <p className="lms-empty">No document has been attached to this lesson yet.</p>
        ) : (
          <>
            <span className="lms-docview__icon"><LmsIcon name="pdf" /></span>
            <div className="lms-docview__body">
              <p className="lms-docview__name">{doc.name || 'Course document'}</p>
              <p className="lms-docview__meta">
                {hasFile
                  ? [sizeLabel(doc.sizeBytes), 'opens on an expiring link'].filter(Boolean).join(' · ')
                  : 'Hosted elsewhere, opens in a new tab'}
              </p>
              {linkError ? <p className="lms-field__error">{linkError}</p> : null}
            </div>

            {hasFile ? (
              <button
                type="button"
                className="lms-btn lms-btn--primary"
                onClick={open}
                disabled={opening}
              >
                <LmsIcon name="download" />
                {opening ? 'Opening…' : 'Open document'}
              </button>
            ) : (
              <a
                className="lms-btn lms-btn--primary"
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LmsIcon name="link" />
                Open document
              </a>
            )}
          </>
        )}
      </div>

      <LessonNav
        slug={slug}
        prev={prev}
        next={next}
        complete={complete}
        onToggleComplete={markComplete}
      />

      <div className="lms-card lms-lesson-page__aside">
        <div className="lms-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'document'}
            className={`lms-tab${tab === 'document' ? ' is-active' : ''}`}
            onClick={() => setTab('document')}
          >
            <LmsIcon name="doc" />
            About
          </button>
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
        </div>

        <div className="lms-tabs__panel">
          {tab === 'document' ? (
            <p className="lms-detail__note" style={{ marginTop: 0 }}>
              {hasFile
                ? 'This document is part of the course. The link that opens it lasts a few minutes and is reissued each time you ask for it.'
                : 'This document is published elsewhere. It opens in a new tab and is readable without enrolling.'}
            </p>
          ) : tab === 'resources' ? (
            <ResourceList resources={data.resources} enrolled={data.enrolled} />
          ) : (
            <NoteEditor slug={slug} lessonId={lesson.id} />
          )}
        </div>
      </div>
    </div>
  );
}
