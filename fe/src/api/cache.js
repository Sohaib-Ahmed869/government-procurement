/* A read the tab remembers.

   The Service Offering page has never had the flash the other pages had, and
   the reason is four lines in api/index.js: `capabilityCardsCache`, a value
   held at module scope, which ServiceAccordion seeds its state from. Come back
   to that page a second time in the same tab and the cards are already in hand
   — the page arrives whole, on the first frame, with nothing to wait for.

   Every other page refetched from nothing on every visit. Measured on
   /our-team against a 900ms API: content on screen at 1148ms on the first
   visit and 1058ms on the SECOND, with a viewport of empty paper in between
   both times. Service Offering's second visit: 99ms, no gap. That gap is what
   reads as a white flash where the "Remain Connected" band sits, because the
   band and the footer are what fill the space until the content displaces
   them.

   So this is the same idea with a key on it, so every public read can have it.

   ---- What it is, and what it is not ---------------------------------------

   It is a per-tab memory, not a data layer. A cached value is returned for the
   first paint and the request still goes out behind it, so an edit made in the
   CMS lands on the next view. Nothing here expires, invalidates or is written
   by anything but the fetch it belongs to: the values are published content
   that changes a few times a week, and the visit that follows an edit picks it
   up.

   It is deliberately NOT wired into api/client.js. A blanket cache under every
   GET would also cache the CMS's own reads, where a list has to be correct the
   instant after a save — and admin pages are the one place a stale row is a
   real bug rather than a briefly old date. The public site opts in, one read
   at a time.

   Gone on reload, by design: this is a module variable, so a refresh is still
   the way anybody gets a guaranteed-fresh page. */
const store = new Map();

// `undefined` means "nothing cached", which is why a miss is not `null`: a read
// that legitimately answered `null` (an unpublished page, say) is a HIT, and
// re-fetching it on every visit is the thing being fixed.
export function readCache(key) {
  return store.has(key) ? store.get(key) : undefined;
}

export function writeCache(key, value) {
  store.set(key, value);
  return value;
}

// Whether a key has an answer. Callers use it to decide their initial status,
// which is what lets a cached page start at 'ready' and never render a wait.
export function hasCache(key) {
  return store.has(key);
}
