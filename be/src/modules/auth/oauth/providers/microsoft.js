import { env } from '../../../../config/env.js';

/* ---------------------------------------------------------------------------
   Microsoft sign-in (Entra ID, formerly Azure AD).

   The provider that matters most for this audience: public-sector staff are
   already signed into a Microsoft account on a managed laptop, so this is the
   button that removes a password rather than adding one.

   Credentials: portal.azure.com → Microsoft Entra ID → App registrations → New
   registration. Add the callback below as a Web redirect URI, then create a
   client secret under Certificates & secrets.

   ---- The tenant setting is a security decision, not a default ---------------

   `common`        any Microsoft account, personal ones included
   `organizations` any work or school account, no personal ones
   `consumers`     personal accounts only
   <tenant-guid>   exactly one organisation

   `common` is the widest and is what a self-serve training site normally wants.
   Narrow it to a tenant id only when the intent really is "only staff of this
   agency", because doing so locks out every other buyer.
   ------------------------------------------------------------------------ */

export const name = 'microsoft';
export const label = 'Microsoft';

const creds = () => env.oauth.microsoft;

const base = () => `https://login.microsoftonline.com/${creds().tenant || 'common'}/oauth2/v2.0`;

export const configured = () => Boolean(creds().clientId && creds().clientSecret);

export function authorizeUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: creds().clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    state,
    response_mode: 'query',
    prompt: 'select_account',
  });
  return `${base()}/authorize?${params}`;
}

/* Reads the ID token's payload without verifying its signature.

   Safe ONLY because of where it is called: this token arrived over TLS, in the
   direct response to a request we made, authenticated with our own client
   secret. There is no third party in that exchange to forge it. A token that
   arrived any other way — from the browser, from a header — MUST be verified
   against the provider's JWKS before a single claim is trusted. */
function readIdToken(idToken) {
  const [, payload] = String(idToken).split('.');
  if (!payload) return {};
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

export async function exchange({ code, redirectUri }) {
  const res = await fetch(`${base()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: creds().clientId,
      client_secret: creds().clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid email profile User.Read',
    }),
  });
  const token = await res.json().catch(() => ({}));
  if (!res.ok || !token.id_token) {
    throw new Error(`Microsoft token exchange failed (${res.status}): ${token.error_description ?? token.error ?? 'no id_token'}`);
  }

  const claims = readIdToken(token.id_token);
  const subject = claims.oid || claims.sub;
  if (!subject) throw new Error('Microsoft returned no subject claim');

  // `email` is not always present; `preferred_username` is the work address in
  // practice for Entra accounts, and `upn` on older tenants.
  const email = (claims.email || claims.preferred_username || claims.upn || '').toLowerCase();

  /* Microsoft has no `email_verified` claim for work accounts, and its absence
     is not a failure — a tenant-issued address is verified by construction,
     because the organisation controls the mailbox and issued the account.

     A PERSONAL account (consumer tenant) is different: those addresses are
     self-asserted, and one can be created at an address someone else uses at
     work. So treat work accounts as verified and personal ones as not. The
     tenant id for consumer accounts is a fixed, documented GUID. */
  const CONSUMER_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';
  const isWorkAccount = Boolean(claims.tid) && claims.tid !== CONSUMER_TENANT;

  return {
    subject: String(subject),
    email,
    emailVerified: isWorkAccount,
    name: claims.name || '',
  };
}

export const microsoftProvider = { name, label, configured, authorizeUrl, exchange };
