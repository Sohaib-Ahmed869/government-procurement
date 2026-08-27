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

    // MEASURED ONCE PER LAYOUT, NOT ONCE PER FRAME.
    //
    // This used to call getBoundingClientRect() on every section inside the
    // scroll handler. Reading a rect forces the browser to flush layout, so
    // every scroll frame on the homepage paid for a full layout of the page —
    // and it paid for it at exactly the moment the reveal animations were
    // running, which is why the fades could stutter on a laptop while a phone
    // (where this ribbon, and so this hook, is not rendered) stayed smooth. It
    // is worse again above 1441px, where the page is laid out at 1440 and
    // `zoom`-scaled (lib/pageScale.js): the layout being flushed is the
    // unscaled one, and the result has to be re-rasterised at the scale.
    //
    // Section tops do not change while the page scrolls, so they are cached and
    // the scroll handler compares numbers. Anything that CAN move them —
    // a resize, an image arriving, a band revealing at a different height —
    // changes the document's size, which the ResizeObserver below catches.
    const tops = new Map();
    let docHeight = 0;

    const remeasure = () => {
      tops.clear();
      for (const id of list) {
        const el = document.getElementById(id);
        if (el) tops.set(id, el.getBoundingClientRect().top + window.scrollY);
      }
      docHeight = document.documentElement.scrollHeight;
    };

    const measure = () => {
      frame = 0;

      // Bottom of the page: the last section is current even if its top never
      // reaches the reading line, which happens when the closing band is
      // shorter than the viewport.
      const atBottom = window.innerHeight + window.scrollY >= docHeight - 2;
      if (atBottom) {
        const last = list.filter((id) => tops.has(id)).pop();
        setActive(last ?? null);
        return;
      }

      // The reading line, in document coordinates.
      const line = window.scrollY + offset;
      let current = null;
      for (const id of list) {
        const top = tops.get(id);
        if (top !== undefined && top <= line) current = id;
      }
      setActive(current);
    };

    // Coalesced to one measurement per frame — scroll fires far more often
    // than the layout can meaningfully change.
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    const onLayoutChange = () => {
      remeasure();
      onScroll();
    };

    remeasure();
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onLayoutChange, { passive: true });

    // Sections render null until their data arrives and images resize them as
    // they load; both move every section below them without firing a scroll or
    // a resize. Watching the body catches all of it in one place.
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onLayoutChange) : null;
    ro?.observe(document.body);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onLayoutChange);
      ro?.disconnect();
    };
  }, [key, enabled, offset]);

  return active;
}
