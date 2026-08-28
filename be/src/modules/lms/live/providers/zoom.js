import { env } from '../../../../config/env.js';

/* ---------------------------------------------------------------------------
   Zoom adapter for live sessions (LMS 17.0a, option A).

   Implements the small interface in ../index.js and nothing else. No other file
   in the codebase names Zoom, so moving to Teams, Meet or an embedded SDK later
   is a sibling of this file rather than a migration.

   ---- Authentication --------------------------------------------------------

   Server-to-Server OAuth, which is what Zoom offers for backend integrations
   since JWT apps were retired. Create the app in the Zoom Marketplace under
   "Server-to-Server OAuth"; it gives you an Account ID, a Client ID and a
   Client Secret. Grant it the meeting write scopes
   (`meeting:write:admin` / `meeting:write`) or every call here returns 4xx.

   The token is short-lived (an hour) and cached in memory below. That cache is
   PER PROCESS, so several containers each hold their own — which is fine, since
   Zoom issues tokens freely, but is the reason there is no attempt to share it.
   ------------------------------------------------------------------------ */

const TOKEN_URL = 'https://zoom.us/oauth/token';
const API = 'https://api.zoom.us/v2';

// Refresh a little before the stated expiry rather than on it — a token that
// expires mid-flight fails the request that is carrying it.
const EXPIRY_SKEW_MS = 60_000;

let cached = { token: '', expiresAt: 0 };

const credentials = () => env.zoom ?? {};

export const name = 'zoom';

export const configured = () =>
  Boolean(credentials().accountId && credentials().clientId && credentials().clientSecret);

async function accessToken() {
  const { accountId, clientId, clientSecret } = credentials();
  if (!configured()) throw new Error('Zoom credentials are not configured.');

  if (cached.token && Date.now() < cached.expiresAt) return cached.token;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(
    `${TOKEN_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    { method: 'POST', headers: { Authorization: `Basic ${basic}` } },
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    // Zoom puts the useful part in `reason`, not `message`.
    throw new Error(`Zoom auth failed (${res.status}): ${body.reason ?? body.message ?? 'no token returned'}`);
  }

  cached = {
    token: body.access_token,
    expiresAt: Date.now() + Math.max(0, (Number(body.expires_in) || 3600) * 1000 - EXPIRY_SKEW_MS),
  };
  return cached.token;
}

async function call(path, { method = 'GET', body } = {}) {
  const token = await accessToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 on DELETE and on most PATCHes: no body to parse.
  if (res.status === 204) return null;

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Zoom ${method} ${path} failed (${res.status}): ${json.message ?? 'unknown error'}`);
  }
  return json;
}

/* Zoom wants a wall-clock time paired with a timezone, not a UTC instant, when
   `timezone` is supplied — so send the instant in Z form and let the timezone
   field carry the meaning. Both are sent deliberately: dropping the timezone
   makes a recurring "10am Sydney" drift by an hour at daylight saving. */
const toZoomTime = (date) => new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');

/* Settings chosen rather than defaulted, because the defaults are wrong for a
   gated course:

     waiting_room          on, so the host admits people — the enrolment gate
                           decides who gets a LINK, this decides who gets in
     join_before_host      off, so nobody holds a room in our name
     approval_type: 2      no Zoom registration; our gate is the registration
     auto_recording        off. Recording a session is a Privacy Act question
                           about named public servants, not a default. */
const MEETING_SETTINGS = {
  waiting_room: true,
  join_before_host: false,
  approval_type: 2,
  auto_recording: 'none',
  mute_upon_entry: true,
};

export async function createMeeting({ title, description, startsAt, durationMinutes, timezone }) {
  const hostId = credentials().userId || 'me';
  const meeting = await call(`/users/${encodeURIComponent(hostId)}/meetings`, {
    method: 'POST',
    body: {
      topic: title.slice(0, 200),
      agenda: (description ?? '').slice(0, 2000),
      // 2 = a scheduled meeting with a fixed start, as opposed to instant or
      // recurring. Recurring sessions would be a different model shape.
      type: 2,
      start_time: toZoomTime(startsAt),
      duration: durationMinutes,
      timezone,
      settings: MEETING_SETTINGS,
    },
  });

  return {
    meetingId: String(meeting.id),
    joinUrl: meeting.join_url ?? '',
    hostUrl: meeting.start_url ?? '',
    passcode: meeting.password ?? '',
  };
}

export async function updateMeeting(meetingId, { title, description, startsAt, durationMinutes, timezone }) {
  await call(`/meetings/${encodeURIComponent(meetingId)}`, {
    method: 'PATCH',
    body: {
      topic: title.slice(0, 200),
      agenda: (description ?? '').slice(0, 2000),
      start_time: toZoomTime(startsAt),
      duration: durationMinutes,
      timezone,
    },
  });
}

export async function cancelMeeting(meetingId) {
  await call(`/meetings/${encodeURIComponent(meetingId)}`, { method: 'DELETE' });
}

/* Per-registrant join links are a Zoom feature on some tiers, and the reason
   this takes `user` at all: the day the account supports them, this returns a
   distinct URL per learner and every call site already passes the learner.
   Until then everyone gets the meeting's own link, and attendance is whatever
   Zoom's participant report says. */
export function joinUrlFor(session, _user) {
  return session.providerRef?.joinUrl ?? '';
}

export const zoomProvider = {
  name,
  configured,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  joinUrlFor,
};
