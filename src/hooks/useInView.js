import { useEffect, useRef, useState } from 'react';

// Returns a ref and an `inView` flag that flips true once the element scrolls
// into the viewport. Used to trigger on-enter reveal animations.
// Respects prefers-reduced-motion by revealing immediately.
export function useInView({
  threshold = 0.15,
  rootMargin = '0px 0px -12% 0px',
  once = true,
  // Change this value to replay the reveal (e.g. pass the current audience so
  // toggling win/award re-triggers the animation).
  resetKey,
} = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset to hidden so the transition replays when resetKey changes.
    setInView(false);

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
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

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once, resetKey]);

  return { ref, inView };
}
