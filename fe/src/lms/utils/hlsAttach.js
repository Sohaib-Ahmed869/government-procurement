/* ---------------------------------------------------------------------------
   Attaching an encrypted HLS playlist to a <video> element (LMS 3.0).

   Safari and EVERY browser on iOS play HLS natively: the playlist goes straight
   on `src` and the browser fetches segments and keys itself. Chrome, Firefox and
   Edge do not — they need hls.js, which parses the playlist and feeds the
   element through Media Source Extensions.

   hls.js is NOT a dependency of this project, so this file must not import it.
   A bare `import('hls.js')` — even a dynamic one, even with @vite-ignore — is
   resolved by Vite's dev server at transform time and fails the whole module
   when the package is absent. So the only automatic path here is the native one,
   and everything else is told plainly why it cannot play.

   ---- Adding Chrome/Firefox support -----------------------------------------

   One command and one edit:

     npm install hls.js

   then replace the `loadHls` body below with a static import at the top of the
   file:

     import Hls from 'hls.js';
     const loadHls = async () => Hls;

   Static, so it fails at build time if the package goes missing — which is the
   right place for that to surface. Nothing else in this file changes.
   ------------------------------------------------------------------------ */

const NATIVE = 'application/vnd.apple.mpegurl';

// Resolves to the hls.js constructor, or null when it is not available.
//
// `window.Hls` is checked because that is what a <script> tag build of hls.js
// sets, which is the one way to have it present without it being a dependency.
// No bundler-visible import: see the note above.
async function loadHls() {
  return typeof window !== 'undefined' && window.Hls ? window.Hls : null;
}

/* Attaches `url` to the element. Resolves to a cleanup function.

   Rejects when the browser cannot play HLS at all, which the player shows to
   the learner — a black rectangle with no explanation is the worse failure. */
export async function attachHls(el, url) {
  if (el.canPlayType(NATIVE)) {
    el.src = url;
    return () => {
      el.removeAttribute('src');
      el.load();
    };
  }

  const Hls = await loadHls();
  if (!Hls?.isSupported?.()) {
    throw new Error(
      'This browser can’t play the secure stream yet. Safari and iOS can — or ask an administrator to enable hls.js.',
    );
  }

  const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
  hls.loadSource(url);
  hls.attachMedia(el);
  return () => hls.destroy();
}
