import { useCallback, useEffect, useState } from 'react';

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

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, threshold, rootMargin, once, resetKey]);

  return { ref, inView };
}
