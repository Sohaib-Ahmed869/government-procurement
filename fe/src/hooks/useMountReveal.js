import { useLayoutEffect, useState } from 'react';
import { REVEAL_RESET_MS } from '../constants/motion.js';

// Reveal flag for sections that are already on screen when the page loads —
// page heroes, mostly, which can't use useInView because they never scroll in.
// Returns false for the first paint and true after it, so the CSS transition
// has a starting point to animate from.
//
// Pass the current audience as `resetKey` and the reveal replays whenever the
// win/award toggle changes, the same way useInView({ resetKey }) does for the
// sections below the fold.
//
// ---- `ready`, for a section whose content comes from the CMS ---------------
//
// The flag is a TIMER, not a measurement of the page: left to itself it turns
// true a frame after mount, which on a page still waiting on the API is a
// reveal played over a "Loading…" line. The content then arrives into a section
// that has already finished animating, so it is painted at its final opacity in
// the frame it mounts — the abrupt appearance this option exists to stop.
//
// Pass `{ ready: status !== 'loading' }` and the reveal is held until the data
// is in hand, then plays REVEAL_RESET_MS later — a beat that exists so the
// content is painted hidden once before it is asked to animate. Without that
// gap React folds the mount and the reveal into one commit and there is nothing
// to transition FROM, which is the same trap the resetKey handling below works
// around.
export function useMountReveal(resetKey, { ready = true } = {}) {
  const [shown, setShown] = useState(false);

  // Layout effect, not a plain effect: the hidden state has to be committed
  // before the browser paints. Scheduled as a normal effect, React is free to
  // fold it in with the setShown(true) that follows a frame later, and the two
  // cancel out — the reveal then never replays on a section already on screen.
  useLayoutEffect(() => {
    // Back to hidden, then reveal once the hidden state has been painted and
    // transitions are live again. Revealed in the same frame it was hidden, the
    // browser has nothing to animate from and the section just appears.
    setShown(false);
    if (!ready) return undefined;
    const id = window.setTimeout(() => setShown(true), REVEAL_RESET_MS);
    return () => window.clearTimeout(id);
  }, [resetKey, ready]);

  return shown;
}
