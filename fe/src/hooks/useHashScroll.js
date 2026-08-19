import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// A1 — makes /#section work on a cold load.
//
// The browser's own hash handling runs before React has rendered anything, so
// by the time the section exists the moment has passed. Worse, the bands that
// fetch (insights, tender portals) mount at zero height and grow when their
// data lands, which moves every anchor below them — scrolling once on mount
// lands in the wrong place.
//
// So this retries: it scrolls to the target, then keeps checking for a short
// window and corrects if the element has moved more than a few pixels. The
// window is short enough that it can't fight a visitor who starts scrolling
// themselves — any wheel, touch or key input cancels it outright.
const SETTLE_MS = 1200;
const CHECK_EVERY_MS = 100;
const TOLERANCE_PX = 4;

export function useHashScroll() {
  const { hash } = useLocation();

  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (!id) return undefined;

    let cancelled = false;
    const stop = () => {
      cancelled = true;
    };

    // Any deliberate input from the visitor wins over the correction loop.
    const OPT = { passive: true };
    window.addEventListener('wheel', stop, OPT);
    window.addEventListener('touchstart', stop, OPT);
    window.addEventListener('keydown', stop, OPT);

    const started = Date.now();
    let timer;

    const settle = () => {
      if (cancelled) return;

      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top;
        // `scroll-margin-top` on the target (see home.css) is what keeps the
        // sticky header from covering the heading, so scrollIntoView is enough
        // here — no manual offset to keep in step with the header's height.
        if (Math.abs(top) > TOLERANCE_PX) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }

      if (Date.now() - started < SETTLE_MS) {
        timer = window.setTimeout(settle, CHECK_EVERY_MS);
      }
    };

    // One frame's grace so the first paint has happened.
    timer = window.setTimeout(settle, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [hash]);
}
