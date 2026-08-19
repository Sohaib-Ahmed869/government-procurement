import { useCallback, useEffect, useRef, useState } from 'react';

// B1 — how far through the article the reader is.
//
// Measured against the article *body*, not the document. Those are different
// numbers and the difference is the whole point: a page with a tall hero, a
// related-insights grid and a footer can be 40% scrolled while the prose has
// not started, and can hit 100% while three paragraphs are still unread.
//
// Returns 0 before the body has been reached and 1 once its last line has
// cleared the reading line, which is the bottom of the viewport less the
// sticky chrome.
//
// B1.2 — it re-measures on three things, because all three move the target:
//   scroll   — the obvious one
//   resize   — reflowing the prose changes its height
//   content  — images finishing loading, or the CMS body arriving late, both
//              change the height *without* a scroll or resize event, which is
//              what makes a progress bar drift out of true on a slow connection
// Returns `[ref, progress]`, where ref is a *callback* ref rather than a
// useRef object. That matters: the article renders a loading state first, so
// the element does not exist on the first pass. With a plain ref the effect
// would run once against null, bail, and never run again — the bar would sit
// at zero for the whole article. A callback ref puts the node in state, so the
// effect re-runs the moment it actually mounts. useInView does the same thing
// for the same reason.
export function useReadingProgress({ offset = 0 } = {}) {
  const [node, setNode] = useState(null);
  const ref = useCallback((el) => setNode(el), []);
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const el = node;
    if (!el) return undefined;

    const measure = () => {
      frame.current = 0;
      const rect = el.getBoundingClientRect();

      // Where the reader's eye is: the bottom of the viewport, less whatever
      // the sticky chrome is covering.
      const line = window.innerHeight - offset;
      const total = rect.height;
      if (total <= 0) {
        setProgress(0);
        return;
      }

      // How much of the article sits above the reading line.
      const read = line - rect.top;
      setProgress(Math.min(1, Math.max(0, read / total)));
    };

    // Coalesced to one measurement per frame — scroll fires far more often than
    // the layout can meaningfully change.
    const schedule = () => {
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    // Height changes that fire no scroll or resize event.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(el);

    // Images inside the body, which resize it as each one arrives.
    const imgs = [...el.querySelectorAll('img')];
    imgs.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', schedule);
        img.addEventListener('error', schedule);
      }
    });

    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      imgs.forEach((img) => {
        img.removeEventListener('load', schedule);
        img.removeEventListener('error', schedule);
      });
    };
  }, [node, offset]);

  return [ref, progress];
}
