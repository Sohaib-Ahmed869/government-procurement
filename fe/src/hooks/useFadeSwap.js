import { useEffect, useState } from 'react';

/* Holds the OLD content on screen for the length of a fade-out, then swaps.

   The browse pages (Prompt Library, Templates) recompute their results straight
   from the URL, so picking a filter used to replace the list between two paints:
   one screenful of cards became a different screenful with nothing in between,
   and on a filter that narrows hard the page also lost most of its height in the
   same frame. Nothing about that says "these are the ones you asked for" — it
   just looks like the page flickered.

   So the results trail the filters. `key` is whatever identifies the current
   selection; when it changes, `fading` goes true and the returned key stays put
   for `duration`, which is what gives the caller something to fade OUT — the
   list you were looking at, not the one replacing it. When the timer lands the
   key catches up and `fading` drops, and the new list fades in.

   The filter rail itself is deliberately NOT driven by this: a radio has to
   answer the click that selected it immediately, whatever the results are doing.

   The default duration is the segment toggle's fade-out (380ms — SWAP_FADE_OUT_MS
   in index.css), so the two read as the same movement.

   Reduced motion gets the swap with no delay at all. A pause with no fade under
   it is not a gentler transition, it is lag. */
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function useFadeSwap(key, duration = 380) {
  const [applied, setApplied] = useState(key);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (key === applied) return undefined;

    const reduced =
      typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;
    if (reduced) {
      setApplied(key);
      return undefined;
    }

    setFading(true);
    const timer = window.setTimeout(() => {
      setApplied(key);
      setFading(false);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [key, applied, duration]);

  return [applied, fading];
}
