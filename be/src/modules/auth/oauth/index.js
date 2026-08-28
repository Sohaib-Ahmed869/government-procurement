import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../../config/env.js';
import { googleProvider } from './providers/google.js';
import { microsoftProvider } from './providers/microsoft.js';

/* ---------------------------------------------------------------------------
   Federated sign-in ("Continue with …").

   Same registry shape as the coach and the live-session provider. To add one:
   write a sibling in providers/ exposing `name`, `label`, `configured`,
   `authorizeUrl` and `exchange`, add it below, give it credentials.

   Each provider is enabled INDEPENDENTLY by the presence of its own
   credentials. With none set, the sign-in screen is exactly what it was — a
   button that leads to a provider nobody configured is worse than no button.
   ------------------------------------------------------------------------ */

const PROVIDERS = {
  [googleProvider.name]: googleProvider,
  [microsoftProvider.name]: microsoftProvider,
};

export const providerFor = (name) => PROVIDERS[name] ?? null;

// What the sign-in screen renders a button for. Names and labels only.
export function availableProviders() {
  if (!env.oauth.enabled) return [];
  return Object.values(PROVIDERS)
    .filter((p) => p.configured())
    .map((p) => ({ name: p.name, label: p.label }));
}

// The callback the provider redirects back to. Must match what is registered in
// the provider's console character for character, which is why it is derived
// from one configured base rather than from the incoming request — a proxy
// rewriting Host would otherwise produce a URL that silently stops matching.
export const redirectUriFor = (provider) =>
  `${env.apiPublicUrl}/api/auth/oauth/${provider}/callback`;

/* ---- State ----------------------------------------------------------------

   `state` is the CSRF defence for the whole flow: it proves the callback we are
   handling belongs to a sign-in WE started, not one an attacker started in
   their own browser and then fed to a victim.

   Signed rather than stored. A server-side store would mean either a database
   round trip per sign-in attempt or an in-memory map that breaks the moment a
   second container exists — and this only has to survive the round trip, which
   an HMAC over an expiry does perfectly well. Nothing secret goes in it; the
   `next` path is already known to the browser. */
const STATE_TTL_MS = 10 * 60 * 1000;

function stateSecret() {
  // Its own purpose, but derived from the JWT secret so there is no second
  // credential to forget to set. Rotating that secret invalidates in-flight
  // sign-ins, which is a ten-minute inconvenience, not an outage.
  return createHmac('sha256', env.jwt.secret).update('oauth-state').digest();
}

export function issueState({ provider, next }) {
  const payload = Buffer.from(
    JSON.stringify({ p: provider, n: next || '', e: Date.now() + STATE_TTL_MS, r: randomBytes(8).toString('hex') }),
  ).toString('base64url');
  const sig = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readState(state) {
  const [payload, sig] = String(state ?? '').split('.');
  if (!payload || !sig) return null;

  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  // Constant-time: a fast reject on the first wrong byte leaks how much of a
  // forged signature was right.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.e || Date.now() > data.e) return null;
    return { provider: data.p, next: data.n };
  } catch {
    return null;
  }
}
