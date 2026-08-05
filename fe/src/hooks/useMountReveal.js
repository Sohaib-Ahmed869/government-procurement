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
export function useMountReveal(resetKey) {
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
    const id = window.setTimeout(() => setShown(true), REVEAL_RESET_MS);
    return () => window.clearTimeout(id);
  }, [resetKey]);

  return shown;
}
