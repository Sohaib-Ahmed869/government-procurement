import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import SecureVideoPlayer from '../../components/player/SecureVideoPlayer.jsx';
import YouTubeEmbed from '../../components/player/YouTubeEmbed.jsx';
import TranscriptPanel from '../../components/player/TranscriptPanel.jsx';
import LessonNav from '../../components/lesson/LessonNav.jsx';
import ResourceList from '../../components/lesson/ResourceList.jsx';
import NoteEditor from '../../components/progress/NoteEditor.jsx';
import BookmarkButton from '../../components/progress/BookmarkButton.jsx';
import LessonStates from '../../components/lesson/LessonStates.jsx';
import { useSecureVideo } from '../../hooks/useSecureVideo.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import { useLesson } from '../../hooks/useLesson.js';
import { progressApi } from '../../../api/lms.js';
import { formatTime, transcriptToText } from '../../utils/transcript.js';

// How often the resume point is written back. Every timeupdate would be four
// requests a second per learner; half a minute loses at most that much position.
const POSITION_SAVE_MS = 30_000;

// A video lesson (L2): protected playback on an expiring link, an identity
// watermark, and a transcript synced both ways.
export default function VideoLessonPage() {
  const { slug, lessonId } = useParams();
  const { user } = useStudentAuth();
  const { data, status, gate, error, complete, markComplete, reload } = useLesson(slug, lessonId);

  const videoRef = useRef(null);
  // The live YouTube player, when this lesson is an embed. Held so the
  // transcript can seek into it the same way it seeks our own player.
  const ytRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tab, setTab] = useState('transcript');
  const lastSavedRef = useRef(0);
  // The most recent position seen, so the save-on-leave below has something to
  // write without waiting for a render.
  const latestRef = useRef(0);

  const [restarted, setRestarted] = useState(false);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setTab('transcript');
    setRestarted(false);
    lastSavedRef.current = 0;
    latestRef.current = 0;
  }, [lessonId]);

  const isEmbed = data?.lesson?.kind === 'youtube';

  // Where the video should open. The saved position wins over the author's
  // "start at" point: that one is for someone arriving fresh, and a learner
  // coming back has somewhere better to be.
  //
  // Frozen for the life of the lesson. It is passed to the YouTube player as
  // its start point, and that player is rebuilt whenever the value changes —
  // so anything that moved it mid-watch would tear down the iframe underneath
  // the learner. Starting over goes through seek() instead, which moves the
  // existing player.
  const resumeAt = data?.resumeAt ?? 0;
  const authorStart = data?.lesson?.youtube?.startSeconds ?? 0;
  const initialStart = useMemo(
    () => resumeAt || authorStart,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessonId, resumeAt, authorStart],
  );

  // Only ask for a playback URL once the lesson is known to be open. Requesting
  // it for a locked lesson just earns a 403 the page already knows about.
  // A YouTube lesson has no signed URL to fetch, so the request is skipped
  // entirely rather than issued and thrown away.
  const video = useSecureVideo(lessonId, { enabled: status === 'ready' && !isEmbed });

  const seek = useCallback((t) => {
    // An embed is somebody else's player, so seeking it goes through the API
    // rather than by setting a property. Same behaviour to the learner:
    // clicking a transcript line moves the video to it.
    const yt = ytRef.current;
    if (yt?.seekTo) {
      yt.seekTo(t, true);
      yt.playVideo?.();
      // Moved straight away rather than waiting for the next poll, so the
      // highlight lands on the line that was clicked instead of lagging a
      // quarter-second behind the click.
      setCurrentTime(t);
      return;
    }

    const el = videoRef.current;
    if (!el) return;
    el.currentTime = t;
    // Same immediate move as the embed above. `timeupdate` normally follows a
    // seek and would correct this within a frame anyway, but not always: on a
    // paused video that hasn't buffered that far yet, the event can be a moment
    // behind or not arrive at all, and the line the learner just clicked should
    // light up when they click it. A later timeupdate overrides this, so the
    // video stays the source of truth.
    setCurrentTime(t);
    el.play?.().catch(() => {
      /* autoplay can be refused; the seek still lands */
    });
  }, []);

  // Resume point (L3). Throttled, and fire-and-forget: failing to record where
  // someone got to is not worth interrupting their lesson over.
  const onTime = useCallback(
    (t) => {
      setCurrentTime(t);
      latestRef.current = t;
      if (t - lastSavedRef.current < POSITION_SAVE_MS / 1000) return;
      lastSavedRef.current = t;
      progressApi.setPosition(lessonId, Math.floor(t)).catch(() => {});
    },
    [lessonId],
  );

  // One more save on the way out. Without it, leaving thirty seconds after the
  // last write throws those thirty seconds away, and the learner comes back to
  // a point they had already watched past — which is the same annoyance the
  // resume was meant to remove.
  //
  // Covers moving to another lesson and leaving the player, which is how people
  // normally go. Closing the tab outright is not caught: a request started in
  // an unloading page is not reliably sent.
  useEffect(
    () => () => {
      const t = latestRef.current;
      if (t > 0 && Math.abs(t - lastSavedRef.current) >= 1) {
        progressApi.setPosition(lessonId, Math.floor(t)).catch(() => {});
      }
    },
    [lessonId],
  );

  // The embed's clock, polled by YouTubeEmbed. Routed through the same handler
  // as our own player so the resume point is recorded for a YouTube lesson too,
  // rather than only for uploaded video.
  const onEmbedTime = useCallback(
    (t, d) => {
      onTime(t);
      if (d) setDuration(d);
    },
    [onTime],
  );

  const downloadTranscript = useCallback(() => {
    if (!data?.transcript?.length) return;
    const blob = new Blob([transcriptToText(data.transcript)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${lessonId}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, slug, lessonId]);

  if (status !== 'ready') {
    return (
      <LessonStates slug={slug} status={status} gate={gate} error={error} onRetry={reload} />
    );
  }

  const { lesson, module: mod, index, total, prev, next, resources, transcript, enrolled } = data;

  // The watermark carries who is watching. Signed out (preview), there is no
  // identity to stamp, so it renders nothing rather than a fake one.
  const watermark = user ? `${user.name} · ${user.email}` : null;

  return (
    <div className="lms-lesson-page lms-lesson-page--video">
      <div className="lms-lesson-page__head">
        <span className="lms-lesson-page__crumb">
          Module {mod.order} · {mod.title} · Lesson {index + 1} of {total}
        </span>
        <h1 className="lms-lesson-page__title">{lesson.title}</h1>
      </div>

      {/* A YouTube lesson is an iframe, not a signed source, so none of the
          expiring-link machinery below applies to it. */}
      {isEmbed ? (
        lesson.youtube?.videoId ? (
          <YouTubeEmbed
            videoId={lesson.youtube.videoId}
            startSeconds={initialStart}
            title={lesson.title}
            onTimeUpdate={onEmbedTime}
            playerRef={ytRef}
          />
        ) : (
          <div className="lms-card">
            <p className="lms-empty">No YouTube link has been added to this lesson yet.</p>
          </div>
        )
      ) : /* A video lesson whose file was never uploaded is the instructor's gap,
          not a playback failure, and says so rather than blaming the link. */
      lesson.video && !lesson.video.hasVideo ? (
        <div className="lms-card">
          <p className="lms-empty">
            No video has been uploaded for this lesson yet.
          </p>
        </div>
      ) : video.status === 'forbidden' ? (
        <div className="lms-card">
          <p className="lms-empty">
            You need to be enrolled in this course to watch this lesson.
          </p>
        </div>
      ) : video.status === 'error' ? (
        <div className="lms-card">
          <p className="lms-empty">
            We couldn’t start this video. {video.error || 'Try again in a moment.'}
          </p>
        </div>
      ) : (
        <SecureVideoPlayer
          videoRef={videoRef}
          src={video.url}
          watermark={watermark}
          startAt={initialStart}
          onTimeUpdate={onTime}
          onLoadedMetadata={setDuration}
        />
      )}

      {/* A video that opens part-way through looks broken unless you are told
          why. It also needs a way out: someone returning to re-watch from the
          top shouldn't have to drag the scrubber back themselves. */}
      {resumeAt > 0 && !restarted ? (
        <p className="lms-resume">
          <LmsIcon name="clock" />
          <span>
            Picked up where you left off, at <strong>{formatTime(resumeAt)}</strong>.
          </span>
          <button
            type="button"
            className="lms-btn lms-btn--sm lms-btn--ghost"
            onClick={() => {
              seek(0);
              setRestarted(true);
            }}
          >
            Start from the beginning
          </button>
        </p>
      ) : null}

      <div className="lms-video__meta">
        {/* An embed reports its clock through the player API now, so it shows
            the same running time as our own player. Until the API answers —
            and if it never does, because the script was blocked — there is no
            clock to show, so it falls back to the lesson's stated length
            rather than sitting at 0:00 looking broken. */}
        {isEmbed && !duration ? (
          <span>
            <LmsIcon name="clock" />
            {lesson.minutes} min
          </span>
        ) : (
          <span>
            <LmsIcon name="clock" />
            {formatTime(currentTime)}
            {duration ? ` / ${formatTime(duration)}` : ''}
          </span>
        )}
        {/* Bookmarking from a video pins the current moment, not just the
            lesson, so the learner returns to the point they marked. At 0:00
            there is no moment to pin. The video hasn't been played, and
            stamping it "0:00" would imply one was chosen. */}
        <BookmarkButton
          slug={slug}
          lessonId={lesson.id}
          at={currentTime > 0 ? currentTime : null}
        />
        {/* Only claimed where it is true. A YouTube embed is public, and
            badging it "protected" would be a lie the UI tells for free. */}
        {isEmbed ? (
          <span className="lms-video__secure" title="Hosted on YouTube, viewable without enrolling">
            <LmsIcon name="play" />
            YouTube
          </span>
        ) : (
          <span className="lms-video__secure" title="Playback links expire and are reissued automatically">
            <LmsIcon name="lock" />
            Protected playback
          </span>
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
          <button type="button" role="tab" aria-selected={tab === 'transcript'}
            className={`lms-tab${tab === 'transcript' ? ' is-active' : ''}`}
            onClick={() => setTab('transcript')}>
            <LmsIcon name="text" />
            Transcript
          </button>
          <button type="button" role="tab" aria-selected={tab === 'resources'}
            className={`lms-tab${tab === 'resources' ? ' is-active' : ''}`}
            onClick={() => setTab('resources')}>
            <LmsIcon name="download" />
            Resources
          </button>
          <button type="button" role="tab" aria-selected={tab === 'notes'}
            className={`lms-tab${tab === 'notes' ? ' is-active' : ''}`}
            onClick={() => setTab('notes')}>
            <LmsIcon name="note" />
            My notes
          </button>
          {tab === 'transcript' ? (
            <button type="button" className="lms-btn lms-btn--sm lms-btn--ghost lms-tabs__trail"
              onClick={downloadTranscript}>
              <LmsIcon name="download" />
              Download
            </button>
          ) : null}
        </div>

        <div className="lms-tabs__panel">
          {tab === 'transcript' ? (
            <TranscriptPanel cues={transcript} currentTime={currentTime} onSeek={seek} />
          ) : tab === 'resources' ? (
            <ResourceList resources={resources} enrolled={enrolled} />
          ) : (
            <NoteEditor slug={slug} lessonId={lesson.id} timestamp={currentTime} />
          )}
        </div>
      </div>
    </div>
  );
}
