import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AUDIENCE, DEFAULT_AUDIENCE } from '../constants/audiences.js';
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

export function AudienceProvider({ children }) {
  const [audience, setAudienceState] = useState(resolveInitialAudience);

  // Keep the URL and storage in step with the segment so a copied link reopens
  // on the same variant.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, audience);

    const url = new URL(window.location.href);
    if (url.searchParams.get('audience') !== audience) {
      url.searchParams.set('audience', audience);
      window.history.replaceState({}, '', url);
    }
  }, [audience]);

  const value = useMemo(
    () => ({
      audience,
      isWin: audience === AUDIENCE.WIN,
      isAward: audience === AUDIENCE.AWARD,
      setAudience(next) {
        if (!isValid(next) || next === audience) return;
        setAudienceState(next);
        track.audienceSelected(next);
      },
    }),
    [audience]
  );

  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

export function useAudience() {
  const ctx = useContext(AudienceContext);
  if (!ctx) throw new Error('useAudience must be used within an AudienceProvider');
  return ctx;
}
