import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

  const setAudience = useCallback(
    (next) => {
      if (!isValid(next) || next === audience) return;

      // Reduced motion: switch outright, with no fade to sit through.
      if (prefersReducedMotion()) {
        setAudienceState(next);
        track.audienceSelected(next);
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
          root.dataset.audience = next;
          setAudienceState(next);
          track.audienceSelected(next);

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
    [audience, clearTimers],
  );

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
