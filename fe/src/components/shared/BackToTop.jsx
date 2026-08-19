import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './BackToTop.css';

// A jump back to the top of a long page, pinned to the bottom left.
//
// Rendered through a portal to <body> rather than in place, and that is not
// tidiness. Public pages sit inside `.page-scale`, which uses `zoom` to scale
// the 1440px layout up on wide screens (index.css). An element with `zoom`
// establishes a containing block for its fixed-position descendants, so a
// `position: fixed` button rendered inside the page would stop being fixed to
// the viewport: it would anchor to the scaled page box and scroll away with it.
// Portalling to <body> puts it outside the zoomed subtree, where `fixed` means
// what it says at every screen size.
//
// `data-audience` lives on <html> (see AudienceContext), so the segment tokens
// still resolve out here.
//
// `targetRef` is what to scroll to. Without one it goes to the top of the
// document; with one it goes to that element, which is how a browse page sends
// someone back to its filters rather than to its hero.
export default function BackToTop({ targetRef, label = 'Back to top', showAfter = 400 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only tracks a boolean, so this does no work per frame beyond a compare;
    // React bails out when the value has not changed.
    const onScroll = () => setVisible(window.scrollY > showAfter);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAfter]);

  const go = () => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = reduced ? 'auto' : 'smooth';

    const el = targetRef?.current;
    if (el) el.scrollIntoView({ behavior, block: 'start' });
    else window.scrollTo({ top: 0, behavior });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <button
      type="button"
      className={`back-to-top${visible ? ' is-visible' : ''}`}
      onClick={go}
      aria-label={label}
      title={label}
      // Off screen it is not a target: taking it out of the tab order stops a
      // keyboard user landing on a control they cannot see, and hiding it from
      // the accessibility tree stops a screen reader announcing one.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="19" x2="12" y2="6" />
        <polyline points="5 13 12 6 19 13" />
      </svg>
    </button>,
    document.body,
  );
}
