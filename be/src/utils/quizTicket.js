import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/* ---------------------------------------------------------------------------
   Proof of when a timed quiz was opened.

   A quiz's `timeLimitMins` used to be enforced only by a countdown in the
   browser. That is not a limit — it is a suggestion with a UI. Refreshing the
   page restarted it, and posting straight to the submit endpoint skipped it
   entirely. For a course whose certificate is meant to mean something, an
   assessment that is not actually timed is worse than one with no timer at all,
   because the transcript claims otherwise.

   ---- Why a signed ticket rather than a database row ------------------------

   The obvious alternative is to write an "attempt started" row when the quiz is
   opened. That costs a write every time anyone so much as looks at a quiz, and
   leaves a row behind for every abandoned one — rows that then have to be
   distinguished from real attempts in every count and every analytic.

   An HMAC over (lesson, user, issued-at) needs no storage, cannot be forged
   without the server secret, and is checked in microseconds. Same shape as the
   HLS playback token and the OAuth state parameter, for the same reasons.

   Nothing secret is inside it: the lesson id and the user id are both already
   known to the browser holding it.
   ------------------------------------------------------------------------ */

// Clock skew between the server issuing and the server checking, plus the
// second or two a submit spends in flight. Generous enough not to fail an
// honest learner on the last question, short enough to be useless as extra time.
export const GRACE_SECONDS = 45;

// A ticket is worthless long after it was issued, whatever the quiz's limit —
// this bounds how long a stolen or stashed one is worth anything.
const MAX_AGE_SECONDS = 6 * 60 * 60;

const b64 = (s) => Buffer.from(s).toString('base64url');

function sign(payload) {
  // Its own purpose string, so a ticket can never be replayed as some other
  // token signed with the same secret.
  return createHmac('sha256', env.jwt.secret).update(`quiz-ticket:${payload}`).digest('base64url');
}

export function issueQuizTicket({ lessonId, userId, now = Date.now() }) {
  const payload = `${lessonId}.${userId ?? ''}.${Math.floor(now / 1000)}`;
  return `${b64(payload)}.${sign(payload)}`;
}

/* Returns { lessonId, userId, issuedAt } or null.

   Never throws: this parses a string the client controls. */
export function readQuizTicket(ticket) {
  if (typeof ticket !== 'string' || ticket.length > 512) return null;

  const dot = ticket.lastIndexOf('.');
  if (dot <= 0) return null;

  const encoded = ticket.slice(0, dot);
  const provided = ticket.slice(dot + 1);

  let payload;
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = sign(payload);
  // Constant-time: a fast reject on the first wrong byte leaks how much of a
  // forged signature was right.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [lessonId, userId, issued] = payload.split('.');
  const issuedAt = Number(issued) * 1000;
  if (!lessonId || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > MAX_AGE_SECONDS * 1000) return null;

  return { lessonId, userId, issuedAt };
}

/* How long the attempt ran, and whether that is within the limit.

   `limitMins` of 0 means untimed, and every ticket passes. */
export function checkQuizTiming({ ticket, lessonId, userId, limitMins }) {
  if (!limitMins || limitMins <= 0) return { ok: true, elapsedSeconds: null };

  const read = readQuizTicket(ticket);
  if (!read) return { ok: false, reason: 'no-ticket' };
  if (String(read.lessonId) !== String(lessonId)) return { ok: false, reason: 'wrong-quiz' };
  // A ticket issued to somebody else is not proof of when THIS learner started.
  if (String(read.userId) !== String(userId)) return { ok: false, reason: 'wrong-learner' };

  const elapsedSeconds = Math.round((Date.now() - read.issuedAt) / 1000);
  if (elapsedSeconds > limitMins * 60 + GRACE_SECONDS) {
    return { ok: false, reason: 'expired', elapsedSeconds };
  }
  return { ok: true, elapsedSeconds };
}
