import { useEffect, useState } from 'react';
import { navPagesApi } from '../api';
import { readCache, writeCache } from '../api/cache.js';

const CACHE_KEY = 'nav-visibility';

// Which top-level nav pages are currently switched off in the CMS (Site →
// Site Navigation). Fetched once by PageLayout and handed down to both Header
// and Footer, rather than each fetching its own copy — they render together
// on every page, so two independent requests for the same small, public list
// would fire on every navigation for no benefit.
//
// Every page wraps itself in its own <PageLayout>, rather than one persistent
// layout the router leaves mounted — so this hook mounts fresh on every
// navigation, not once for the visit. Starting from an empty Set each time,
// on the reasoning that a page briefly showing a link the CMS is about to
// hide is a non-issue, turned out to BE the issue: a hidden item flashed
// visible on every click before the fetch resolved and took it away again,
// which reads as a bug even though nothing was ever actually reachable
// through it. Seeded from the per-tab cache (see api/cache.js) instead — the
// same fix as the "white flash" that cache exists for elsewhere — so every
// navigation after the first paints the right nav immediately, and the fetch
// behind it only ever updates the cache for the NEXT one.
export function useNavVisibility() {
  const [hidden, setHidden] = useState(() => readCache(CACHE_KEY) ?? new Set());

  useEffect(() => {
    let alive = true;
    navPagesApi
      .list()
      .then((pages) => {
        if (!alive) return;
        const next = new Set((pages || []).filter((p) => p.visible === false).map((p) => p.key));
        writeCache(CACHE_KEY, next);
        setHidden(next);
      })
      .catch(() => {
        /* leave whatever was already showing */
      });
    return () => {
      alive = false;
    };
  }, []);

  return hidden;
}
