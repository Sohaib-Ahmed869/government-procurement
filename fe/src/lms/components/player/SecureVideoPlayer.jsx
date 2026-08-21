import { useEffect, useState } from 'react';
import WatermarkOverlay from './WatermarkOverlay.jsx';
import { attachHls } from '../../utils/hlsAttach.js';

// Protected video playback (L2).
//
// What the guards here actually do. Worth being precise, because it is easy to
// overstate:
//   controlsList="nodownload"  removes the download item from the native menu
//   disablePictureInPicture    keeps the stream inside the page
//   onContextMenu              blocks right-click → "Save video as"
//   no <a download>, no src on a plain element the user can copy out easily
//
// Together these stop casual saving. They do NOT stop a determined viewer: a
// screen recorder captures anything that renders.
//
// `kind: 'hls'` swaps the single MP4 for an AES-128 encrypted stream — no one
// file URL to pass around, and keys that rotate and are re-gated on every
// request (see be/src/modules/lms/hlsKeys.js). That is a real step up from a
// signed MP4 and is still NOT DRM: the key is handed to anyone allowed to play,
// so yt-dlp and ffmpeg can both save the stream. Genuine protection is
// Widevine/FairPlay with a licence server. Say that plainly rather than
// claiming the video cannot be copied.
//
// Native controls rather than a custom control bar: they bring keyboard access,
// captions and screen-reader support for free, and a hand-rolled bar reliably
// loses at least one of those.
export default function SecureVideoPlayer({
  videoRef,
  src,
  poster,
  watermark,
  onTimeUpdate,
  onLoadedMetadata,
  // 'mp4' (a signed file) or 'hls' (an encrypted playlist).
  kind = 'mp4',
  // Where to start the first time this lesson loads: the position the learner
  // left off at, or 0.
  startAt = 0,
}) {
  const [hlsError, setHlsError] = useState('');

  // An HLS playlist cannot go on `src` unless the browser plays HLS natively
  // (Safari and everything on iOS do). Elsewhere it is handed to hls.js, which
  // feeds the element through Media Source Extensions.
  useEffect(() => {
    if (kind !== 'hls' || !src) return undefined;
    const el = videoRef.current;
    if (!el) return undefined;

    setHlsError('');
    let detach = () => {};
    let cancelled = false;

    attachHls(el, src)
      .then((cleanup) => {
        if (cancelled) cleanup?.();
        else detach = cleanup ?? (() => {});
      })
      .catch((err) => {
        if (!cancelled) setHlsError(err?.message ?? 'This browser cannot play the secure stream.');
      });

    return () => {
      cancelled = true;
      detach();
    };
  }, [kind, src, videoRef]);
  // Two jobs, one mechanism.
  //
  // Across a mid-lesson URL refresh, the live position wins: swapping `src`
  // reloads the element, which would otherwise drop the learner back to 0:00.
  // On the FIRST load there is no live position, so the saved one is used
  // instead — which is what makes a half-watched lesson pick up where it was.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return undefined;

    const resumeAt = el.currentTime || startAt;
    if (resumeAt <= 0) return undefined;

    const restore = () => {
      // Not past the end. A saved position within a few seconds of the finish
      // would otherwise reload straight onto the closing frame.
      if (!Number.isFinite(el.duration) || resumeAt < el.duration - 5) {
        el.currentTime = resumeAt;
      }
      el.removeEventListener('loadedmetadata', restore);
    };

    // `loadedmetadata` has already fired if the element is further along than
    // that, and adding the listener then would wait for an event that is never
    // coming.
    if (el.readyState >= 1) restore();
    else el.addEventListener('loadedmetadata', restore);

    return () => el.removeEventListener('loadedmetadata', restore);
  }, [src, videoRef, startAt]);

  return (
    <div className="lms-video">
      <video
        ref={videoRef}
        className="lms-video__el"
        // For HLS the source is attached by the effect above — either natively
        // or through hls.js — so `src` is left off deliberately. Setting both
        // makes the element race its own loader.
        src={kind === 'hls' ? undefined : (src ?? undefined)}
        poster={poster}
        controls
        preload="metadata"
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => onLoadedMetadata?.(e.currentTarget.duration)}
      >
        Your browser can’t play this video.
      </video>
      <WatermarkOverlay label={watermark} />
      {hlsError ? <p className="lms-video__error">{hlsError}</p> : null}
    </div>
  );
}
