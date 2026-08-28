import { env } from '../../../../config/env.js';

/* ---------------------------------------------------------------------------
   Google sign-in.

   Authorization Code flow. The code is exchanged for tokens on the SERVER,
   never in the browser, which is why a client secret is safe to hold here and
   would not be in a SPA.

   Credentials: console.cloud.google.com → APIs & Services → Credentials →
   Create Credentials → OAuth client ID → Web application. Add the callback URL
   below to "Authorised redirect URIs" exactly, including the scheme and port —
   Google matches it character for character.
   ------------------------------------------------------------------------ */

export const name = 'google';
export const label = 'Google';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const creds = () => env.oauth.google;

export const configured = () => Boolean(creds().clientId && creds().clientSecret);

export function authorizeUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: creds().clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    // Ask for the account chooser every time. Silent reuse of whichever Google
    // account the browser happens to hold is how somebody signs in as the wrong
    // person on a shared machine without noticing.
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params}`;
}

export async function exchange({ code, redirectUri }) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: creds().clientId,
      client_secret: creds().clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const token = await res.json().catch(() => ({}));
  if (!res.ok || !token.access_token) {
    throw new Error(`Google token exchange failed (${res.status}): ${token.error_description ?? token.error ?? 'no token'}`);
  }

  const profileRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const p = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !p.sub) {
    throw new Error(`Google profile lookup failed (${profileRes.status})`);
  }

  return {
    subject: String(p.sub),
    email: (p.email ?? '').toLowerCase(),
    // Google states this explicitly. It is the single most important field
    // here — see the note in oauth.controller.js about why an unverified
    // address must never be allowed to match an existing account.
    emailVerified: p.email_verified === true,
    name: p.name || p.given_name || '',
  };
}

export const googleProvider = { name, label, configured, authorizeUrl, exchange };
