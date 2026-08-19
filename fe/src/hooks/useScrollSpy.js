import { useEffect, useState } from 'react';

// A1 — which section is currently being read.
//
// Deliberately not an IntersectionObserver. A page of full-height bands has two
// or three intersecting at once, and picking a winner from the entries means
// re-implementing "which is nearest the top" anyway — with the added problem
// that a band shorter than the viewport can be fully visible and still lose to
// a taller one. Reading positions directly on scroll is both simpler and what
// the reader actually perceives: the section whose top has most recently passed
// under the header is the one they are looking at.
//
// `offset` is how far down the viewport the reading line sits — roughly the
// sticky header's height plus a little, so a heading counts as current once it
// has cleared the chrome rather than the instant it appears at the bottom.
const READ_LINE_OFFSET = 140;

export function useScrollSpy(ids, { enabled = true, offset = READ_LINE_OFFSET } = {}) {
  const [active, setActive] = useState(null);

  // Serialised so the effect doesn't re-run on every render just because the
  // caller passed a fresh array literal.
  const key = ids.join('|');

  useEffect(() => {
    if (!enabled || !key) {
      setActive(null);
      return undefined;
    }

    const list = key.split('|');
    let frame = 0;

    const measure = () => {
      frame = 0;

      // Bottom of the page: the last section is current even if its top never
      // reaches the reading line, which happens when the closing band is
      // shorter than the viewport.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        const last = list.filter((id) => document.getElementById(id)).pop();
        setActive(last ?? null);
        return;
      }

      let current = null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - offset <= 0) current = id;
      }
      setActive(current);
    };

    // Coalesced to one measurement per frame — scroll fires far more often
    // than the layout can meaningfully change.
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [key, enabled, offset]);

  return active;
}
