// Loads YouTube's IFrame Player API, once per page.
//
// A plain <iframe> embed tells us nothing about what it is doing: no playback
// position, no duration, no way to seek into it. That is fine for a video on
// its own, and useless for a lesson, where the transcript has to follow the
// playhead and clicking a line has to move it.
//
// The API is global and single-instance by design (it calls one well-known
// callback when it is ready), so the promise is memoised: several lessons, or
// several mounts of the same one, share the single script tag.

let pending = null;

export function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  // Already there — either a previous load, or the host page brought its own.
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    // Chained rather than overwritten. Clobbering it would break anything else
    // on the page waiting for the same signal.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      // The next caller gets a fresh attempt rather than this dead promise.
      pending = null;
      reject(new Error('Could not load the YouTube player'));
    };
    document.head.appendChild(script);
  });

  return pending;
}
