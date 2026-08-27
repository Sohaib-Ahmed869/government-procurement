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

      // Measured in SCROLL POSITIONS, not in how much of the article happens to
      // be above the reading line.
      //
      // It used to be `(line - rect.top) / total`, and that is why the bar
      // arrived part-filled: on a page opened at the top, the first screenful
      // of the article is already above the reading line, so the fraction was
      // whatever share of the article that screenful happened to be — a third
      // of a short one, more on a phone. The reader had read none of it.
      //
      // So: `begin` is the scroll position where reading starts and `end` the
      // one where the last line clears the reading line, and progress is where
      // we are between them. `begin` is floored at 0 — the top of the page —
      // which is what makes an article that opens above the fold start empty.
      const scrolled = window.scrollY;
      const top = rect.top + scrolled;
      const end = top + total - line;
      const begin = Math.max(0, Math.min(top - line, end));
      const span = end - begin;

      // An article shorter than the space above the reading line has no scroll
      // to measure: it is either wholly read or not reached yet.
      if (span <= 0) {
        setProgress(rect.bottom <= line ? 1 : 0);
        return;
      }

      // Quantised to half a percent before it goes into state. The raw fraction
      // changes on every scroll frame, and every change re-rendered the whole
      // article — a React render per frame, competing with the reveal
      // animations for the same frame budget. Half a percent is finer than the
      // bar can draw (it is a few hundred pixels wide at most), so the bar is
      // pixel-identical and the renders drop from one per frame to at most two
      // hundred over the length of the article.
      const next = Math.min(1, Math.max(0, (scrolled - begin) / span));
      setProgress((prev) => (Math.abs(next - prev) < 0.005 && next > 0 && next < 1 ? prev : next));
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
