import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';
import { signAuthToken } from '../../utils/token.js';
import { ROLES, STAFF_ROLES } from '../../constants/roles.js';
import { User } from '../../models/User.js';
import { recordAudit } from '../../models/AuditLog.js';
import {
  availableProviders,
  providerFor,
  redirectUriFor,
  issueState,
  readState,
} from './oauth/index.js';

/* ---------------------------------------------------------------------------
   "Continue with Google / Microsoft" (L6).

   Adds a second WAY IN to the accounts that already exist. It is not a second
   account system: the same `users` collection, the same roles, the same JWT.

   ---- The rule everything here turns on -------------------------------------

   An account is only ever matched by email when the provider says that email is
   VERIFIED. This is the whole security of the feature, so it is worth stating
   the attack it prevents:

     Without the check, anyone who can get a provider to issue them a token
     carrying somebody else's address — trivially, by signing up to a provider
     that never checks — clicks "Continue with X" and is handed that person's
     account. Every enrolment, certificate and, for staff, the CMS.

   So: verified email may match an existing account. Unverified may not, ever —
   not to link, not to create. Google states this outright; for Microsoft a
   work/school account is verified by construction (the organisation issued the
   mailbox) while a personal one is not. See each provider file.

   The second-best defence is `subject`: once linked, sign-in matches on the
   provider's immutable id rather than the address, so changing an email at the
   provider cannot move an account link anywhere.
   ------------------------------------------------------------------------ */

// GET /auth/oauth/providers. Public — the sign-in screen has to render before
// anyone is signed in. Names and labels only, never credentials.
export const listProviders = asyncHandler(async (_req, res) =>
  ok(res, { providers: availableProviders() }),
);

/* Where the browser is sent when the dance is over.

   `next` comes from the client, so it is a path the app can be talked into
   visiting — an open-redirect hole if it is used as given. Anything that is not
   a single-slash relative path is discarded. `//evil.com` is the case that
   catches people: it is a protocol-relative URL, not a path. */
function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return '';
  return next;
}

const frontendBase = () => env.clientOrigins[0] ?? 'http://localhost:5173';

function failureRedirect(reason) {
  return `${frontendBase()}/learn/login?error=${encodeURIComponent(reason)}`;
}

// GET /auth/oauth/:provider/start
export const start = asyncHandler(async (req, res) => {
  const provider = providerFor(req.params.provider);
  if (!provider || !provider.configured() || !env.oauth.enabled) {
    throw ApiError.notFound('That sign-in method is not available');
  }

  const state = issueState({
    provider: provider.name,
    next: safeNext(req.query.next),
  });

  return res.redirect(
    provider.authorizeUrl({ redirectUri: redirectUriFor(provider.name), state }),
  );
});

/* GET /auth/oauth/:provider/callback

   Redirects rather than returning JSON: the browser arrives here from the
   provider, not from our own fetch, so there is nothing on this page to render
   a response into.

   The token is handed back in the URL FRAGMENT. A fragment is never sent to a
   server, so it stays out of access logs, proxies and Referer headers — and the
   callback screen strips it from the address bar immediately. The stronger
   answer is an httpOnly cookie, which would also take the token out of reach of
   any XSS on the page; that is a change to how EVERY session in this app is
   stored, not something to introduce on one route, and it is written up as the
   next step rather than half-done here. */
export const callback = asyncHandler(async (req, res) => {
  const parsed = readState(req.query.state);
  if (!parsed || parsed.provider !== req.params.provider) {
    // Either forged, tampered with, or simply left open for ten minutes.
    return res.redirect(failureRedirect('expired'));
  }

  const provider = providerFor(req.params.provider);
  if (!provider?.configured()) return res.redirect(failureRedirect('unavailable'));

  // The provider reports the user's own refusals here — "cancelled" is a normal
  // outcome, not an error worth a scary screen.
  if (req.query.error) {
    return res.redirect(failureRedirect(req.query.error === 'access_denied' ? 'cancelled' : 'failed'));
  }
  if (!req.query.code) return res.redirect(failureRedirect('failed'));

  let profile;
  try {
    profile = await provider.exchange({
      code: req.query.code,
      redirectUri: redirectUriFor(provider.name),
    });
  } catch {
    // Deliberately not surfaced to the browser: the message can carry client
    // configuration detail, and the person signing in cannot act on any of it.
    return res.redirect(failureRedirect('failed'));
  }

  // 1. Already linked? Match on the provider's immutable subject.
  let user = await User.findOne({
    identities: { $elemMatch: { provider: provider.name, subject: profile.subject } },
  }).select('+active');

  let created = false;

  if (!user) {
    // 2. No link yet. Only an email the provider VOUCHES for may go further.
    if (!profile.email || !profile.emailVerified) {
      return res.redirect(failureRedirect('unverified-email'));
    }

    const existing = await User.findOne({ email: profile.email }).select('+active');

    if (existing) {
      // 3. Link this provider to the account that already owns the address.
      existing.identities.push({
        provider: provider.name,
        subject: profile.subject,
        email: profile.email,
      });
      await existing.save();
      user = existing;

      recordAudit({
        req,
        action: 'auth.oauth.link',
        entity: 'User',
        entityId: user._id,
        summary: `Linked ${provider.label} to ${user.email}`,
      });
    } else {
      /* 4. Brand new person. Always a STUDENT — the same rule self-signup
         follows. A federated login must never be able to mint staff: the CMS is
         reached by a role an administrator granted, not by whoever happens to
         hold an address. */
      user = await User.create({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        role: ROLES.STUDENT,
        identities: [
          { provider: provider.name, subject: profile.subject, email: profile.email },
        ],
      });
      created = true;

      recordAudit({
        req,
        action: 'auth.oauth.signup',
        entity: 'User',
        entityId: user._id,
        summary: `New account via ${provider.label}: ${user.email}`,
      });
    }
  }

  // Deactivation has to hold here too. An account switched off in the CMS must
  // not be reachable by going round the password.
  if (!user.active) return res.redirect(failureRedirect('inactive'));

  user.lastLoginAt = new Date();
  await user.save();

  const token = signAuthToken({ sub: user._id, role: user.role });

  /* Staff land in the CMS, everyone else in the LMS — the same role→home rule
     the password login uses, kept here rather than left to the client, which
     would otherwise have to know the role table too. */
  const home = STAFF_ROLES.includes(user.role) ? '/admin' : '/learn';
  const next = safeNext(parsed.next) || home;

  const fragment = new URLSearchParams({
    token,
    next,
    role: user.role,
    ...(created ? { welcome: '1' } : {}),
  });

  return res.redirect(`${frontendBase()}/learn/auth/callback#${fragment}`);
});
