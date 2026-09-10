import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import LessonNav from '../../components/lesson/LessonNav.jsx';
import DocumentViewer from '../../components/lesson/DocumentViewer.jsx';
import PreviewGate from '../../components/lesson/PreviewGate.jsx';
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

// Whether the in-page viewer can draw this. It reads PDFs and nothing else, so
// a slide deck or a Word file goes down the embed path instead.
function looksLikePdf(doc) {
  if (!doc) return false;
  if (doc.mimeType) return doc.mimeType.toLowerCase().includes('pdf');
  const name = (doc.name || doc.url || '').toLowerCase().split('?')[0];
  return name.endsWith('.pdf');
}

/* A documentation lesson (L1): the document, read here.

   It used to be a card with an "Open document" button that threw the file at
   another tab. That put the reading somewhere the lesson could not see: the
   page had no idea whether a word of it had been looked at, so it could not
   hold the way forward on having read it, and the learner was pushed out of the
   course to do the one thing the course had asked of them.

   The file is drawn into the page instead, and Next stays shut until the bottom
   of the last page has been on screen.

   An uploaded file still comes through the same expiring signed URL as lesson
   video, so it stays gated on enrolment. That URL is now requested on arrival
   rather than on a click — the old note about a five-minute link going stale
   before anyone pressed the button stops applying when nobody has to press one,
   and the viewer needs it immediately. */
export default function DocLessonPage() {
  const { slug, lessonId } = useParams();
  const { data, status, gate, error, markComplete, reload } = useLesson(slug, lessonId);

  const [tab, setTab] = useState('document');
  const [link, setLink] = useState(null); // { url, name, expiresAt }
  const [linkError, setLinkError] = useState('');
  // Set when the last page has been scrolled to — or when the document turns
  // out to be one this app cannot draw, see `onUnavailable`.
  const [readToEnd, setReadToEnd] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const doc = data?.lesson?.document;
  const hasFile = Boolean(doc?.hasFile);
  const hasLink = Boolean(doc?.url);

  useEffect(() => {
    setTab('document');
    setLink(null);
    setLinkError('');
    setReadToEnd(false);
    setUnavailable(false);
  }, [lessonId]);

  // The signed URL for an uploaded file, fetched as soon as the lesson is known
  // to be open. A linked document needs no exchange — it is already a URL.
  useEffect(() => {
    if (status !== 'ready' || !hasFile) return undefined;
    let alive = true;
    videoApi
      .documentUrl(lessonId)
      .then((fresh) => {
        if (alive) setLink(fresh);
      })
      .catch((err) => {
        if (!alive) return;
        setLinkError(err?.message ?? 'Could not open the document.');
        // Nothing to read means nothing to read to the end of. Holding Next
        // shut on top of a document that failed to load would strand the
        // learner on a lesson they have no way to finish.
        setReadToEnd(true);
      });
    return () => {
      alive = false;
    };
  }, [status, hasFile, lessonId]);

  const onReachedEnd = useCallback(() => setReadToEnd(true), []);

  // The viewer could not parse it: not a PDF after all, or hosted somewhere
  // that refuses cross-origin reads. It falls back to an embed, which the
  // browser draws and the app cannot see into, so the gate opens — a rule that
  // can no longer be checked must not become a wall.
  const onUnavailable = useCallback(() => {
    setUnavailable(true);
    setReadToEnd(true);
  }, []);

  if (status !== 'ready') {
    return <LessonStates slug={slug} status={status} gate={gate} error={error} onRetry={reload} />;
  }

  const { course, lesson, index, total, prev, next, enrolled } = data;
  const src = hasFile ? link?.url : doc?.url;
  const canDraw = looksLikePdf(doc) && !unavailable;

  return (
    <div className="lms-lesson-page">
      <div className="lms-lesson-page__head">
        <div className="lms-lesson-page__meta">
          <span><LmsIcon name="clock" /> {lesson.minutes} min read</span>
          {doc?.sizeBytes ? <span><LmsIcon name="pdf" /> {sizeLabel(doc.sizeBytes)}</span> : null}
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

      <div className="lms-card lms-docview__card">
        {!hasFile && !hasLink ? (
          <p className="lms-empty">No document has been attached to this lesson yet.</p>
        ) : linkError ? (
          <p className="lms-empty">{linkError}</p>
        ) : !src ? (
          <p className="lms-empty">Opening the document…</p>
        ) : canDraw ? (
          <DocumentViewer
            url={src}
            name={doc.name || link?.name}
            onReachedEnd={onReachedEnd}
            onUnavailable={onUnavailable}
          />
        ) : (
          // Everything the viewer can't draw. The browser gets a go at it in an
          // iframe — which handles a PDF it is allowed to fetch itself — and
          // there is a way out to a tab for the formats it can only download.
          <div className="lms-docview">
            <div className="lms-docview__bar">
              <span className="lms-docview__name">
                <LmsIcon name="doc" />
                {doc.name || 'Course document'}
              </span>
              <a className="lms-btn lms-btn--sm" href={src} target="_blank" rel="noopener noreferrer">
                <LmsIcon name="link" />
                Open in a new tab
              </a>
            </div>
            <iframe
              className="lms-docview__frame"
              src={src}
              title={doc.name || 'Course document'}
            />
          </div>
        )}
      </div>

      <PreviewGate course={course} lesson={lesson} enrolled={enrolled} />

      <LessonNav
        slug={slug}
        prev={prev}
        next={next}
        index={index}
        total={total}
        onAdvance={enrolled ? markComplete : undefined}
        canAdvance={readToEnd}
        blockedHint="Scroll to the end of the document to continue"
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
                ? 'This document is part of the course. It is fetched on a link that lasts a few minutes and is reissued each time you open the lesson.'
                : 'This document is published elsewhere and is readable without enrolling.'}
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
