import { useEffect, useState } from 'react';
import logo from '../../assets/icons/gp-02.svg';
import './SiteLoader.css';

// A2 — the first-load animation.
//
// Shown on every full page load, over the top of everything, and dismissed once
// the page behind it is genuinely ready. Three guards shape how long that is:
//
//   MIN_MS  — a floor, so on a warm cache the mark doesn't flash on and off,
//             which reads as a glitch rather than an intro.
//   MAX_MS  — a ceiling, so a stalled asset or a slow API can never leave a
//             visitor staring at a spinner. Past this it lifts regardless.
//   the hero — on the homepage the loader also waits for the hero video to be
//             playable. Without that the overlay lifts onto the poster still
//             and the footage cuts in a second later, which is exactly the
//             swap the loader exists to cover.
//
// It renders nothing for a visitor who has asked for reduced motion, and
// nothing inside the CMS or the LMS. It does not render on client-side
// navigation either — this is a page load's intro, and the router never
// remounts it.
const MIN_MS = 1800;
const MAX_MS = 6000;

// HAVE_FUTURE_DATA — enough buffered to start playing and keep going. Waiting
// for HAVE_ENOUGH_DATA (4) would mean holding the page for the whole clip on a
// slow connection, which is what MAX_MS is there to prevent anyway.
const VIDEO_READY = 3;

// The intro belongs to the public site. Someone opening the CMS or the LMS is
// going to work, and an animated splash in front of a login form is friction
// rather than welcome — so those two areas skip it outright.
const NO_LOADER_PATHS = ['/admin', '/learn'];

function shouldSkip() {
  if (typeof window === 'undefined') return true;
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return true;
  }
  // Read off `location` rather than the router: this is decided before the
  // first paint, and the component sits outside <Routes> so it has no match to
  // consult. A deep link straight into /admin never sees the overlay at all.
  const path = window.location.pathname;
  return NO_LOADER_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

// True once nothing is left to wait for: the window has loaded, and if this
// page has a hero video, it has buffered enough to play. A page with no hero
// video (every page but the homepage) is ready as soon as the window is.
function pageIsReady() {
  if (document.readyState !== 'complete') return false;

  const video = document.querySelector('video[data-hero-video]');
  if (!video) return true;

  // A video that has errored is never going to be ready. The hero drops to its
  // poster in that case, which is already the right picture to reveal.
  if (video.error) return true;

  return video.readyState >= VIDEO_READY;
}

export default function SiteLoader() {
  // Resolved once, before the first paint, so the overlay is either there from
  // frame one or never rendered — it can't appear a beat after the page has
  // already drawn.
  const [active, setActive] = useState(() => !shouldSkip());
  // Separate from `active`: the overlay stays mounted through its fade so the
  // page is revealed behind it rather than by it vanishing.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!active) return undefined;

    // The page underneath is mid-layout; letting it scroll behind the overlay
    // means a visitor can scroll to somewhere they can't see.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const startedAt = performance.now();
    let pollTimer;
    let leaveTimer;
    let unmountTimer;
    let dismissed = false;

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      window.clearTimeout(pollTimer);

      // Whatever is left of the floor, so a fast load still gets a full intro
      // rather than a flash.
      const held = performance.now() - startedAt;
      leaveTimer = window.setTimeout(() => {
        setLeaving(true);
        // Matches the fade in SiteLoader.css. Unmounted afterwards so the
        // overlay isn't left in the tree swallowing pointer events.
        unmountTimer = window.setTimeout(() => setActive(false), 620);
      }, Math.max(0, MIN_MS - held));
    };

    // Polled rather than driven by events, because the two things being waited
    // on arrive by different routes: `load` is a window event that has often
    // already fired by the time React mounts, while the hero <video> doesn't
    // exist yet at all on the first tick. One poll covers both without having
    // to reach into a component that hasn't mounted.
    const poll = () => {
      if (pageIsReady()) dismiss();
      else pollTimer = window.setTimeout(poll, 80);
    };
    poll();

    const ceiling = window.setTimeout(dismiss, MAX_MS);

    return () => {
      window.clearTimeout(pollTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(unmountTimer);
      window.clearTimeout(ceiling);
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className={`site-loader${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Government Procurement"
    >
      <div className="site-loader__mark">
        {/* The ring is drawn behind the mark and rotates on its own, so the
            logo itself never spins — a wordmark spinning end over end reads as
            a broken asset. */}
        <span className="site-loader__ring" aria-hidden="true" />
        <img
          className="site-loader__logo"
          src={logo}
          alt=""
          width="1153"
          height="1000"
        />
      </div>

      <p className="site-loader__wordmark">
        <span>Government</span>
        <span>Procurement</span>
      </p>

      {/* An indeterminate bar rather than a percentage: there is no real figure
          to report, and a fake one that jumps to 100% is worse than none. */}
      <span className="site-loader__bar" aria-hidden="true">
        <span className="site-loader__bar-fill" />
      </span>
    </div>
  );
}
