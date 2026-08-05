// Homepage segments the whole public site re-orients around (Bible S1).
// Deep-linkable via ?audience=win|award
export const AUDIENCE = Object.freeze({ WIN: 'win', AWARD: 'award' });
export const DEFAULT_AUDIENCE = AUDIENCE.WIN;

// Eyebrow above the page title, on the homepage and Capabilities heroes. The
// homepage lets the CMS override it per segment; this is the fallback.
export const AUDIENCE_EYEBROW = Object.freeze({
  [AUDIENCE.AWARD]: 'Award government contracts',
  [AUDIENCE.WIN]: 'Win government contracts',
});
