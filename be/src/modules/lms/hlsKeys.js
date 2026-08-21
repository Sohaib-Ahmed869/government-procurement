import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

/* ---------------------------------------------------------------------------
   Keys for AES-128 encrypted HLS (LMS 3.0).

   READ THIS BEFORE TRUSTING IT. AES-128 HLS is not DRM. The key is handed to
   anybody the gate lets play the video, so anyone who can watch can also
   decrypt: `yt-dlp` and ffmpeg both follow #EXT-X-KEY and will happily save the
   stream. What this buys over a signed MP4 is narrower:

     · there is no single file URL to pass around — a stream is a playlist plus
       hundreds of segments, each behind its own expiring link;
     · a key is useless on its own, and each one unlocks only the segments in
       its rotation group, so a leaked key is worth ~a minute of video;
     · every key request re-checks the enrolment, so access is revoked mid-play
       rather than at the next page load.

   Real protection against a determined copier is Widevine/FairPlay with a
   licence server, and even that loses to a screen recorder. Say so plainly to
   clients rather than selling this as uncopyable.

   ---- Keys are derived, never stored ----------------------------------------

   key(lesson, n) = HKDF-SHA256(secret, salt = lessonId, info = "hls-key:n")

   Deriving rather than storing means: no key table to leak, no migration when a
   lesson is re-encoded, the same key every time across restarts and across
   instances behind a load balancer, and rotation costs nothing — group n+1 is
   just a different `info` string. Rotating the SECRET invalidates every key at
   once, which is the break-glass lever.
   ------------------------------------------------------------------------ */

// 16 bytes: AES-128 is what HLS's METHOD=AES-128 means. Not a choice.
const KEY_BYTES = 16;

// How many segments share one key. At ~6s segments, 10 is about a minute of
// video per key — short enough that a leaked key is worth little, long enough
// that the player isn't fetching a key for every segment.
export const KEY_ROTATION_SEGMENTS = Number(env.hls?.rotateEvery) || 10;

// Which rotation group a segment belongs to.
export const keyGroupFor = (segmentIndex, rotateEvery = KEY_ROTATION_SEGMENTS) =>
  Math.floor(segmentIndex / rotateEvery);

function secret() {
  const s = env.hls?.keySecret;
  // Refused rather than defaulted. A default secret is the same as no
  // encryption, and it would be the kind of thing nobody notices in production
  // until it is quoted back to them in a pen-test report.
  if (!s || s.length < 32) {
    throw new Error(
      'HLS_KEY_SECRET is missing or too short (needs 32+ chars). Encrypted video cannot be served without it.',
    );
  }
  return s;
}

// The raw 16 bytes for one lesson's rotation group.
export function deriveKey(lessonId, group) {
  return Buffer.from(
    hkdfSync('sha256', secret(), String(lessonId), `hls-key:${group}`, KEY_BYTES),
  );
}

/* ---- Playback tokens -------------------------------------------------------

   The player fetches keys itself, and it cannot be relied on to send an
   Authorization header: Safari plays HLS natively, and native playback offers
   no hook to add one. So the key URI carries a short-lived token instead.

   The token is NOT the authorisation. It says "this browser was handed this
   playlist, recently, for this lesson and this person" — the key endpoint
   still re-runs the enrolment gate on every request. That is deliberate: it is
   what makes a revoked enrolment stop playback part-way through rather than at
   the next page load, and it means a leaked token is worth nothing on its own.
   ------------------------------------------------------------------------ */

const TOKEN_TTL_SECONDS = Number(env.hls?.tokenTtlSeconds) || 300;

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload) {
  return b64(createHmac('sha256', secret()).update(payload).digest());
}

// `userId` is empty for a signed-out viewer on a free preview, which is a real
// case and not an error.
export function issuePlaybackToken({ lessonId, userId, now = Date.now() }) {
  const exp = Math.floor(now / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${lessonId}.${userId ?? ''}.${exp}`;
  return `${b64(payload)}.${sign(payload)}`;
}

// Returns { lessonId, userId, exp } or null. Never throws on malformed input:
// this parses attacker-controlled strings.
export function readPlaybackToken(token, { now = Date.now() } = {}) {
  if (typeof token !== 'string' || token.length > 512) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const payload = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8');
  const given = Buffer.from(token.slice(dot + 1), 'base64url');
  const want = Buffer.from(sign(payload), 'base64url');

  // Length-check first: timingSafeEqual throws on a length mismatch, and the
  // length of an HMAC is not a secret.
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  const [lessonId, userId, expRaw] = payload.split('.');
  const exp = Number(expRaw);
  if (!lessonId || !Number.isFinite(exp)) return null;
  if (exp * 1000 < now) return null;

  return { lessonId, userId: userId || null, exp };
}

// For tests and for the one-off that generates a secret for .env.
export const generateSecret = () => randomBytes(32).toString('hex');
