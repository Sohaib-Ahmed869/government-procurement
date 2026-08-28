import { useEffect, useState } from 'react';
import { authApi, BASE_URL } from '../../../api';

/* "Continue with …" buttons (L6).

   Rendered only for providers the SERVER says are configured, so a button never
   leads somewhere nobody set up. With none configured this renders nothing at
   all and the sign-in screen is exactly what it was.

   These are plain links, not fetches. The whole point of the flow is that the
   browser leaves for the provider and comes back; an XHR cannot do that, and
   `window.location.assign` would only be a slower way of writing an anchor. */

const MARK = {
  google: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.3 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 23 23" width="17" height="17" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  ),
};

export default function OAuthButtons({ next = '', label = 'Or continue with' }) {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    authApi
      .oauthProviders()
      .then((d) => {
        if (!cancelled) setProviders(d?.providers ?? []);
      })
      // Silent on purpose. If this lookup fails the screen still has email and
      // password, which is the thing that must never be blocked by an optional
      // extra failing to load.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!providers.length) return null;

  return (
    <div className="lms-oauth">
      <div className="lms-oauth__divider">
        <span>{label}</span>
      </div>
      <div className="lms-oauth__buttons">
        {providers.map((p) => (
          <a
            key={p.name}
            className="lms-btn lms-btn--block lms-oauth__btn"
            href={`${BASE_URL}/auth/oauth/${p.name}/start${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          >
            <span className="lms-oauth__mark">{MARK[p.name] ?? null}</span>
            Continue with {p.label}
          </a>
        ))}
      </div>
    </div>
  );
}
