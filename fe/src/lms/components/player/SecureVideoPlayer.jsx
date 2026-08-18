import { useEffect } from 'react';
import WatermarkOverlay from './WatermarkOverlay.jsx';

// Protected video playback (L2).
//
// What the guards here actually do. Worth being precise, because it is easy to
// overstate:
//   controlsList="nodownload"  removes the download item from the native menu
//   disablePictureInPicture    keeps the stream inside the page
//   onContextMenu              blocks right-click → "Save video as"
//   no <a download>, no src on a plain element the user can copy out easily
//
// Together these stop casual saving. They do NOT stop a determined viewer: the
// URL is still visible in devtools and a screen recorder captures anything that
// renders. Real protection is encrypted HLS/DASH with DRM (Widevine/FairPlay)
// and short key rotation, which is a backend media-pipeline decision. The
// expiring URL (useSecureVideo) plus the identity watermark are what limit
// redistribution in the meantime.
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
  // Where to start the first time this lesson loads: the position the learner
  // left off at, or 0.
  startAt = 0,
}) {
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
        src={src ?? undefined}
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
    </div>
  );
}
