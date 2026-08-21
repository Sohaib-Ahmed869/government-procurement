import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { AUDIENCE, DEFAULT_AUDIENCE } from '../constants/audiences.js';
import { SWAP_FADE_OUT_MS, SWAP_FADE_IN_MS } from '../constants/motion.js';
import { track } from '../lib/dataLayer.js';

const STORAGE_KEY = 'gp.audience';

const AudienceContext = createContext(null);

function isValid(value) {
  return value === AUDIENCE.WIN || value === AUDIENCE.AWARD;
}

// Precedence: ?audience= in the URL, then the persisted choice, then the default.
// Bible S1: the choice persists and is deep-linkable via ?audience=win|award.
function resolveInitialAudience() {
  if (typeof window === 'undefined') return DEFAULT_AUDIENCE;

  const fromUrl = new URLSearchParams(window.location.search).get('audience');
  if (isValid(fromUrl)) return fromUrl;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isValid(stored)) return stored;

  return DEFAULT_AUDIENCE;
}

// Puts [data-audience] on <html> before React renders anything. Without it the
// first paint — the loader especially, which is the first thing on screen —
// resolves the role tokens against the :root defaults and then re-colours a
// frame later once the provider's effect runs. Called from main.jsx.
export function stampInitialAudience() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.audience = resolveInitialAudience();
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function AudienceProvider({ children }) {
  const [audience, setAudienceState] = useState(resolveInitialAudience);
  const location = useLocation();

  // Keep the URL and storage in step with the segment so a copied link reopens
  // on the same variant. The attribute on <html> is what themes the page: the
  // ramps in styles/tokens.css hang off [data-audience], so setting it once at
  // the root resolves the role tokens for the chrome and for any section that
  // doesn't carry the attribute itself.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, audience);
    document.documentElement.dataset.audience = audience;

    const url = new URL(window.location.href);
    if (url.searchParams.get('audience') !== audience) {
      url.searchParams.set('audience', audience);
      window.history.replaceState({}, '', url);
    }
  }, [audience]);

  // A3: every content switch is a cross-fade, and the scroll position is left
  // alone. The page fades out at its current scroll depth, the copy and the
  // palette both change while nothing is legible, and it fades back in — so the
  // visitor keeps their place instead of being thrown to the top, which is what
  // this used to do (window.scrollTo in AudienceToggle).
  //
  // The state machine lives here rather than in the toggle so anything that
  // switches segment — the header toggle, a deep link, a future in-page control
  // — plays the same transition. `data-audience-swap` on <html> is the only
  // thing the CSS reads (see index.css).
  const timers = useRef([]);
  const frames = useRef([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    frames.current.forEach(window.cancelAnimationFrame);
    frames.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  // The switch itself, with no transition around it. Sets the attribute before
  // the state so the palette is in place for the very next paint.
  const applyNow = useCallback((next) => {
    document.documentElement.dataset.audience = next;
    setAudienceState(next);
    track.audienceSelected(next);
  }, []);

  /* `immediate` skips the cross-fade.

     The fade exists for the HEADER TOGGLE, where the page stays where it is and
     only its copy and colours change — fading out, swapping and fading back in
     is what stops that being a jarring snap.

     A link is not that. The page is already being replaced, and holding the old
     palette for the 380ms fade-out means the new page paints in the previous
     segment's colours and then lurches into its own — which reads as a bug
     rather than as a transition. So navigation switches outright and the new
     page is simply correct when it arrives. */
  const setAudience = useCallback(
    (next, { immediate = false } = {}) => {
      if (!isValid(next) || next === audience) return;

      // Reduced motion: switch outright, with no fade to sit through.
      if (immediate || prefersReducedMotion()) {
        applyNow(next);
        return;
      }

      const root = document.documentElement;
      // A second click while a swap is still playing restarts it from the
      // current frame rather than stacking two sets of timers.
      clearTimers();

      root.dataset.audienceSwap = 'out';
      timers.current.push(
        window.setTimeout(() => {
          // The palette moves FIRST, synchronously, and only then does the swap
          // go to 'in'. Both used to happen in this one tick, and the order was
          // the wrong way round: the suppression rule in the A3 block of
          // index.css keys off data-audience-swap='out', so lifting it in the
          // same tick as the palette change left every colour inside a faded
          // element free to transition. What you saw was the old segment's
          // colour fading to the new one over --gp-swap *while the content was
          // fading back in* — the wrong colour, briefly, before it settled. It
          // was worst on anything saturated: the Government Panels hero button
          // is amber on Win and mint on Award, so it announced itself.
          //
          // Set here rather than left to the effect below, which is passive and
          // runs after the next paint — too late to be covered by 'out'.
          applyNow(next);

          // Two frames, so the palette change is actually painted while
          // transitions are still suppressed. Lifting the suppression in the
          // same frame it was applied gives the browser one style recalculation
          // with transitions live, and the snap becomes a cross-fade again.
          frames.current.push(
            window.requestAnimationFrame(() => {
              frames.current.push(
                window.requestAnimationFrame(() => {
                  root.dataset.audienceSwap = 'in';
                }),
              );
            }),
          );
        }, SWAP_FADE_OUT_MS),
      );
      timers.current.push(
        window.setTimeout(() => {
          delete root.dataset.audienceSwap;
        }, SWAP_FADE_OUT_MS + SWAP_FADE_IN_MS),
      );
    },
    [audience, clearTimers, applyNow],
  );

  /* Follow ?audience= when NAVIGATION changes it.

     The segment was resolved once, at mount, and then never looked at the URL
     again. That was fine for a deep link pasted into a fresh tab and wrong for
     every link inside the site: the footer's two columns point at
     `/service-offering?audience=win` and `?audience=award`, so clicking a Win
     link from an Award page loaded the Win page with the Award palette and the
     toggle still reading Award. The URL said one thing and the site showed
     another.

     Only acts on a link that actually names a segment. A link that carries no
     `audience` param leaves the visitor's choice alone rather than resetting it
     — which is what the header's nav relies on. Note that the FOOTER now names
     a segment on every link in its two columns, shared pages included, because
     there the link sits under a heading that names one; see Footer.jsx.

     Guarded by `handledNav`, and that guard is load-bearing rather than tidy.
     `setAudience` is rebuilt whenever `audience` changes, so this effect re-runs
     after every switch — including one the HEADER TOGGLE made. The write-back
     below uses history.replaceState, which the router never sees, so at that
     moment the router's search still names the segment the visitor just left.
     Without the guard the effect would read it and switch straight back, and
     the toggle would appear not to work at all on any page reached by an
     audience link.

     Keyed on `key` as well as `search`, so navigating between two pages that
     both carry `?audience=win` still counts as a fresh navigation. */
  const handledNav = useRef(null);
  // useLayoutEffect, not useEffect: this runs after the DOM is updated but
  // BEFORE the browser paints, so the new page's first frame already carries the
  // right palette. On useEffect it would paint once in the old segment's colours
  // and correct itself immediately after, which is a visible flash.
  useLayoutEffect(() => {
    const stamp = `${location.key}:${location.search}`;
    if (handledNav.current === stamp) return;
    handledNav.current = stamp;

    const fromUrl = new URLSearchParams(location.search).get('audience');
    if (isValid(fromUrl)) setAudience(fromUrl, { immediate: true });
  }, [location, setAudience]);

  const value = useMemo(
    () => ({
      audience,
      isWin: audience === AUDIENCE.WIN,
      isAward: audience === AUDIENCE.AWARD,
      setAudience,
    }),
    [audience, setAudience],
  );

  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

export function useAudience() {
  const ctx = useContext(AudienceContext);
  if (!ctx) throw new Error('useAudience must be used within an AudienceProvider');
  return ctx;
}
