// Build-time feature switches.
//
// B7 — Find a Bid Writer is built and tested but must stay off the live site
// until the client says otherwise. One switch, three positions:
//
//   off      (default) the route is not registered, the nav has no entry, and
//            the API 404s for anonymous callers. There is nothing to find.
//   preview  the page works and can be used, but marks itself noindex and stays
//            out of the nav. This is what staging runs.
//   live     fully on, in the nav, indexable.
//
// Read once here rather than scattered through components, so "what does this
// flag do" has a single answer. `off` is the default for anything unrecognised,
// including the variable being absent: a production build that has never heard
// of it gets the safe answer.
//
// The backend has its own copy of the same switch (FEATURE_BID_WRITERS). Both
// must be flipped — see docs/GO-LIVE-BID-WRITERS.md.
const raw = import.meta.env.VITE_FEATURE_BID_WRITERS;

export const BID_WRITERS = ['preview', 'live'].includes(raw) ? raw : 'off';

// The page exists at all.
export const bidWritersEnabled = BID_WRITERS !== 'off';
// ...and is allowed in the nav and in search results.
export const bidWritersPublic = BID_WRITERS === 'live';
