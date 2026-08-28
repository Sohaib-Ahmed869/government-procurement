import { env } from '../../../config/env.js';
import { zoomProvider } from './providers/zoom.js';

/* ---------------------------------------------------------------------------
   Which platform hosts a live session, and whether one is available at all.

   The registry is the swap point, and the reason the pathway document calls
   option A (hand off to Zoom) cheap to revisit. To move to Teams, Meet, or an
   embedded SDK such as Daily or LiveKit:

     1. write a sibling of providers/zoom.js exposing the same members —
        `name`, `configured`, `createMeeting`, `updateMeeting`, `cancelMeeting`,
        `joinUrlFor`;
     2. add it to PROVIDERS below;
     3. set LIVE_PROVIDER to its name and give it credentials.

   Nothing else changes. The model, the controller, the join gate and both
   screens are written against that interface and name no vendor.
   ------------------------------------------------------------------------ */

const PROVIDERS = {
  [zoomProvider.name]: zoomProvider,
};

export function activeProvider() {
  return PROVIDERS[env.live.provider] ?? null;
}

/* Whether sessions can be scheduled right now, and if not, WHY in words a
   screen can show.

   Three distinct "no"s, deliberately not collapsed into a boolean: switched off
   on purpose, pointed at a provider that does not exist, and configured but
   missing credentials are three different problems with three different fixes.
   An instructor reading "live sessions unavailable" learns nothing. */
export function liveStatus() {
  if (!env.live.enabled) {
    return { ready: false, reason: 'disabled', message: 'Live sessions are switched off.' };
  }

  const provider = activeProvider();
  if (!provider) {
    return {
      ready: false,
      reason: 'unknown-provider',
      message: `No adapter named "${env.live.provider}". Set LIVE_PROVIDER to one that exists.`,
    };
  }

  if (!provider.configured()) {
    return {
      ready: false,
      reason: 'no-credentials',
      provider: provider.name,
      message: `${provider.name} is selected but has no credentials, so meeting links can't be created.`,
    };
  }

  return { ready: true, provider: provider.name };
}

/* Creates the meeting for a session, or records why it couldn't.

   Deliberately NOT fatal. A scheduling record is useful even when the provider
   is down or unconfigured — an instructor who has told thirty learners about
   Thursday should not lose the session because Zoom returned a 500. The session
   saves, carries its error, and the screen offers a retry.

   Mutates and returns the session; the caller saves. */
export async function attachMeeting(session) {
  const status = liveStatus();
  if (!status.ready) {
    session.provider = env.live.provider;
    session.providerError = status.message;
    return session;
  }

  const provider = activeProvider();
  try {
    const meeting = await provider.createMeeting({
      title: session.title,
      description: session.description,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
      timezone: session.timezone,
    });
    session.provider = provider.name;
    session.providerRef = meeting;
    session.providerError = '';
  } catch (err) {
    session.provider = provider.name;
    session.providerError = String(err?.message ?? err).slice(0, 500);
  }
  return session;
}

/* Keeps the provider in step after a reschedule. Same tolerance as above: a
   meeting that could not be updated leaves the session with an error to show
   rather than refusing the edit, because the local record being right matters
   more than the two staying in sync this second. */
export async function syncMeeting(session) {
  if (!session.providerRef?.meetingId) return attachMeeting(session);

  const provider = activeProvider();
  if (!provider?.configured()) return session;

  try {
    await provider.updateMeeting(session.providerRef.meetingId, {
      title: session.title,
      description: session.description,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
      timezone: session.timezone,
    });
    session.providerError = '';
  } catch (err) {
    session.providerError = String(err?.message ?? err).slice(0, 500);
  }
  return session;
}

/* Best-effort teardown. A cancelled session is cancelled in our database
   whatever the provider says — leaving a stale meeting on Zoom is untidy, but
   refusing to cancel because a third party is unreachable is worse. */
export async function releaseMeeting(session) {
  const provider = activeProvider();
  if (!provider?.configured() || !session.providerRef?.meetingId) return;
  try {
    await provider.cancelMeeting(session.providerRef.meetingId);
  } catch {
    // Deliberately swallowed: see above.
  }
}
