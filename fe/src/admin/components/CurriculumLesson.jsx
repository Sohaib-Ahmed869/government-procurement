import { useEffect, useRef, useState } from 'react';
import { videoApi } from '../../api/lms.js';

const KIND_LABEL = {
  text: 'text', video: 'video', youtube: 'youtube', doc: 'doc', quiz: 'quiz',
};

function stamp(t) {
  const s = Math.floor(t % 60);
  const m = Math.floor(t / 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// One lesson in the review dialog, expandable to its actual content.
//
// A reviewer approving a course for publication has to be able to READ it. A
// row saying "quiz · 5 questions" says nothing about whether the questions are
// answerable, and "video · file ✓" says nothing about whether the transcript
// matches. Collapsed by default so a forty-lesson course is still scannable.
export default function CurriculumLesson({ lesson, flags }) {
  const [open, setOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoState, setVideoState] = useState('idle'); // idle | loading | ready | error
  const [videoError, setVideoError] = useState('');

  // "Have we already asked?" is tracked in a REF, not in state.
  //
  // With `videoState` in the dependency array, setting it to 'loading'
  // re-ran this effect, whose cleanup flipped `alive` on the request still in
  // flight. The response was then discarded, the re-run hit the guard and never
  // asked again, and the row sat on "Loading the video…" forever. A ref changes
  // without re-running the effect, which is the whole point here.
  const requestedRef = useRef(false);

  // Fetched when the row is opened, not when the dialog renders. A five-minute
  // URL issued for every lesson up front has usually lapsed before a reviewer
  // scrolls to it, and most rows are never opened at all.
  useEffect(() => {
    if (!open || !lesson.video || requestedRef.current) return undefined;
    requestedRef.current = true;

    let alive = true;
    setVideoState('loading');
    (async () => {
      try {
        const { url } = await videoApi.signedUrl(lesson._id);
        if (!alive) return;
        setVideoUrl(url);
        setVideoState('ready');
      } catch (err) {
        if (!alive) return;
        setVideoError(err?.message ?? '');
        setVideoState('error');
        // Let a later reopen try again, since this may have been transient.
        requestedRef.current = false;
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, lesson._id, lesson.video]);

  const hasContent =
    Boolean(lesson.body) ||
    Boolean(lesson.youtube?.videoId) ||
    Boolean(lesson.document) ||
    Boolean(lesson.quiz) ||
    Boolean(lesson.transcript?.length) ||
    Boolean(lesson.video);

  return (
    <li className={`admin-curric__lesson${open ? ' is-open' : ''}`}>
      <div className="admin-curric__lesson-row">
        <span className={`admin-curric__kind admin-curric__kind--${lesson.kind}`}>
          {KIND_LABEL[lesson.kind] ?? lesson.kind}
        </span>
        <span className="admin-curric__lesson-title">{lesson.title}</span>
        <span className="admin-curric__flags">
          {flags.map((f) => (
            <span
              key={f.label}
              className={`admin-curric__flag${f.missing ? ' admin-curric__flag--missing' : ''}`}
            >
              {f.label}
            </span>
          ))}
        </span>
        {hasContent ? (
          <button
            type="button"
            className="admin-curric__toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Hide' : 'View'}
          </button>
        ) : (
          <span className="admin-curric__toggle is-empty">empty</span>
        )}
      </div>

      {open ? (
        <div className="admin-curric__content">
          {lesson.body ? (
            <div className="admin-curric__block">
              <h5>Lesson text</h5>
              <div className="admin-curric__prose">
                {lesson.body.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          ) : null}

          {lesson.video ? (
            <div className="admin-curric__block">
              <h5>Video</h5>
              {/* Playable, not just named. Approving a video lesson on the
                  strength of its filename is the thing this dialog exists to
                  prevent. The source is a signed URL fetched when the row is
                  opened, on the same short expiry a learner's playback uses. */}
              {videoState === 'loading' ? (
                <p className="admin-curric__kv">Loading the video…</p>
              ) : videoState === 'error' ? (
                <p className="admin-curric__kv">
                  Couldn’t load this video. {videoError}
                </p>
              ) : videoUrl ? (
                <video
                  className="admin-curric__video"
                  src={videoUrl}
                  controls
                  preload="metadata"
                  controlsList="nodownload"
                />
              ) : null}
              <p className="admin-curric__kv">
                {lesson.video.name || 'Uploaded video'}
                {lesson.video.sizeBytes
                  ? ` · ${(lesson.video.sizeBytes / 1e6).toFixed(1)} MB`
                  : ''}
              </p>
            </div>
          ) : null}

          {lesson.youtube?.videoId ? (
            <div className="admin-curric__block">
              <h5>YouTube</h5>
              {/* Playable here. Approving a video lesson without watching it is
                  the thing this dialog exists to prevent. */}
              <div className="admin-curric__embed">
                <iframe
                  title={`${lesson.title} video`}
                  src={`https://www.youtube-nocookie.com/embed/${lesson.youtube.videoId}${
                    lesson.youtube.startSeconds ? `?start=${lesson.youtube.startSeconds}` : ''
                  }`}
                  allow="encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {lesson.youtube.note ? <p className="admin-curric__kv">{lesson.youtube.note}</p> : null}
            </div>
          ) : null}

          {lesson.document ? (
            <div className="admin-curric__block">
              <h5>Document</h5>
              <p className="admin-curric__kv">
                {lesson.document.name || lesson.document.url || 'Attached document'}
              </p>
              {lesson.document.url ? (
                <a href={lesson.document.url} target="_blank" rel="noopener noreferrer">
                  Open the linked document
                </a>
              ) : null}
              {lesson.document.summary ? (
                <p className="admin-curric__kv">{lesson.document.summary}</p>
              ) : null}
            </div>
          ) : null}

          {lesson.transcript?.length ? (
            <div className="admin-curric__block">
              <h5>Transcript · {lesson.transcript.length} cues</h5>
              {/* The first stretch only. A full transcript can run to hundreds
                  of cues and would bury everything below it. */}
              <div className="admin-curric__cues">
                {lesson.transcript.slice(0, 12).map((c, i) => (
                  <p key={i}><span>{stamp(c.t)}</span>{c.text}</p>
                ))}
                {lesson.transcript.length > 12 ? (
                  <p className="admin-curric__kv">
                    and {lesson.transcript.length - 12} more cues
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {lesson.quiz ? (
            <div className="admin-curric__block">
              <h5>
                Quiz · {lesson.quiz.passMark}% to pass
                {lesson.quiz.timeLimitMins ? ` · ${lesson.quiz.timeLimitMins} min limit` : ''}
              </h5>
              <ol className="admin-curric__questions">
                {lesson.quiz.questions.map((q) => (
                  <li key={q._id}>
                    <p className="admin-curric__prompt">{q.prompt}</p>
                    {q.options?.length ? (
                      <ul>
                        {q.options.map((o) => (
                          <li
                            key={o.id}
                            className={q.correct?.includes(o.id) ? 'is-correct' : undefined}
                          >
                            {o.text}
                            {q.correct?.includes(o.id) ? <span> correct</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {q.type === 'boolean' ? (
                      <p className="admin-curric__kv">Answer: {q.correct?.[0] ?? 'not set'}</p>
                    ) : null}
                    {q.type === 'text' ? (
                      <p className="admin-curric__kv">
                        Accepts: {q.accept?.length ? q.accept.join(', ') : 'nothing set'}
                      </p>
                    ) : null}
                    {q.explanation ? (
                      <p className="admin-curric__why">{q.explanation}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
