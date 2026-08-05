import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { REVEAL_RESET_MS } from '../constants/motion.js';

// Returns a ref and an `inView` flag that flips true once the element scrolls
// into the viewport. Used to trigger on-enter reveal animations.
// Respects prefers-reduced-motion by revealing immediately.
//
// `ref` is a callback ref (not a useRef object) so the observer is (re)attached
// whenever the node actually mounts. This matters for sections that render
// `null` until data loads — with a plain ref the setup effect would run once
// with a null element and never re-run, leaving the content stuck hidden.
export function useInView({
  threshold = 0.15,
  rootMargin = '0px 0px -12% 0px',
  once = true,
  // Change this value to replay the reveal (e.g. pass the current audience so
  // toggling win/award re-triggers the animation).
  resetKey,
} = {}) {
  const [node, setNode] = useState(null);
  const ref = useCallback((el) => setNode(el), []);
  const [inView, setInView] = useState(false);

  // Hide again the moment resetKey changes, before the browser paints. A plain
  // effect isn't enough for a section that's already on screen: the observer
  // re-fires a frame later and React folds the two updates together, so the
  // element never goes back to its start state and the reveal doesn't replay.
  useLayoutEffect(() => {
    setInView(false);
  }, [resetKey]);

  useEffect(() => {
    if (!node) return undefined;

    // Reset to hidden so the transition replays when resetKey changes.
    setInView(false);

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    // Held back rather than observed straight away. A section already on screen
    // reports as intersecting immediately, so watching it in the same frame it
    // was hidden reveals it again before the hidden state has been painted —
    // and the animation is a flicker. The wait costs nothing on a section the
    // visitor still has to scroll to.
    const start = window.setTimeout(() => observer.observe(node), REVEAL_RESET_MS);
    return () => {
      window.clearTimeout(start);
      observer.disconnect();
    };
  }, [node, threshold, rootMargin, once, resetKey]);

  return { ref, inView };
}
