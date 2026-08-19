import { useEffect, useState } from 'react';

// How tall the sticky site chrome currently is.
//
// Anything that wants to sit directly beneath the header has to know this, and
// it is not a constant: the announcement banner adds to it and can be
// dismissed, and the mobile layout gives the audience toggle a row of its own.
// Hard-coding a number gets one breakpoint right and hides the bar behind the
// header on the other, which is exactly what happened here.
export function useChromeHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = document.querySelector('.page-layout__chrome');
    if (!el) return undefined;

    // `offsetHeight`, not `getBoundingClientRect().height`.
    //
    // Above 1440px the page is laid out at 1440 and scaled up with CSS `zoom`
    // (see .page-scale in index.css). getBoundingClientRect reports the *zoomed*
    // height, but the number is fed back in as a CSS `top` inside that same
    // zoomed subtree, where it gets multiplied by the zoom a second time. The
    // bar then sat below the header by exactly the difference, and the gap grew
    // with the window: 17px at 1600, 61px at 1920, 189px at 2560.
    //
    // offsetHeight is in the element's own unzoomed CSS pixels, which is the
    // same space `top` is resolved in, so the two agree at every width.
    const measure = () => setHeight(el.offsetHeight);
    measure();

    // The banner being dismissed changes the height without a resize event.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return height;
}
