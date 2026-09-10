import { useEffect, useRef, useState } from 'react';
import { loadYouTubeApi } from '../../utils/youtubeApi.js';

// How often the playhead is read. An iframe emits no timeupdate event, so the
// only way to follow it is to ask. Four times a second is what makes a
// transcript line light up when it is spoken rather than a beat later, and it
// is one method call — cheaper than the render it triggers.
const POLL_MS = 250;

// A YouTube lesson's player.
//
// Deliberately NOT dressed up to look like the secure player. That one carries
// a "Protected playback" badge because its source is a signed,
// expiring URL; this is a public video anyone can open on YouTube. Borrowing
// the same chrome would imply a protection that isn't there.
//
// Driven through the IFrame Player API rather than embedded as a bare iframe,
// because a lesson needs two things a bare iframe cannot give: where playback
// is up to (so the transcript can follow it) and the ability to seek (so
// clicking a transcript line goes there). If the API can't load — blocked
// script, no network for it — it falls back to the plain iframe, which still
// plays. The transcript simply stops following, which is what it did before.
//
// youtube-nocookie.com is the privacy-preserving host: it doesn't set tracking
// cookies until the learner actually plays something.
export default function YouTubeEmbed({
  videoId,
  startSeconds = 0,
  title,
  onTimeUpdate,
  // Fires when the video runs out, so an embed lesson finishes the same way an
  // uploaded one does: the tick, then the up-next countdown. The <video>
  // element has a real `ended` event; an iframe has a player state, so this is
  // where the two are made to mean the same thing.
  onEnded,
  // Filled with the live player so the page can seek into it.
  playerRef,
}) {
  const hostRef = useRef(null);
  const [fallback, setFallback] = useState(false);
  // Held in refs so the API callbacks always reach the current handler without
  // being torn down and rebuilt every time the page re-renders.
  const onTimeRef = useRef(onTimeUpdate);
  onTimeRef.current = onTimeUpdate;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    if (!videoId) return undefined;

    let player = null;
    let timer = null;
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;

        player = new YT.Player(hostRef.current, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            start: startSeconds || 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              if (playerRef) playerRef.current = player;
              // Polled unconditionally rather than only while playing, so
              // scrubbing the YouTube bar while paused moves the transcript
              // too. Someone hunting for a moment is exactly when following
              // the playhead is most useful.
              timer = setInterval(() => {
                if (typeof player?.getCurrentTime !== 'function') return;
                onTimeRef.current?.(player.getCurrentTime() ?? 0, player.getDuration?.() ?? 0);
              }, POLL_MS);
            },
            // 0 is YT.PlayerState.ENDED. Read off the YT namespace rather
            // than hard-coded, with the literal as the fallback for the case
            // where the constants aren't on the object we were handed.
            onStateChange: (e) => {
              if (cancelled) return;
              if (e?.data === (YT.PlayerState?.ENDED ?? 0)) onEndedRef.current?.();
            },
            onError: () => setFallback(true),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (playerRef) playerRef.current = null;
      // The API replaced our host node with its own iframe; destroy() puts a
      // fresh one back, which is what the next mount needs to attach to.
      try {
        player?.destroy?.();
      } catch {
        /* already gone with the unmounted tree */
      }
    };
  }, [videoId, startSeconds, playerRef]);

  if (fallback) {
    // No player API here, so no playhead and no end event: the transcript stops
    // following and the up-next countdown doesn't fire. The video still plays,
    // which is the point of the fallback, and the Next button is still below.
    return (
      <div className="lms-video lms-video--embed">
        <iframe
          className="lms-video__frame"
          src={`https://www.youtube-nocookie.com/embed/${videoId}${
            startSeconds ? `?start=${startSeconds}` : ''
          }`}
          title={title || 'Lesson video'}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="lms-video lms-video--embed">
      {/* Replaced by the API's own iframe on mount. The wrapper carries the
          sizing, so the swap doesn't change how it renders. */}
      <div ref={hostRef} className="lms-video__frame" title={title || 'Lesson video'} />
    </div>
  );
}
