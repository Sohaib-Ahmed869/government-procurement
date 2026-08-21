import { createCipheriv } from 'node:crypto';
import { deriveKey, keyGroupFor, KEY_ROTATION_SEGMENTS } from './hlsKeys.js';

/* ---------------------------------------------------------------------------
   Encrypting segments and authoring the playlist (LMS 3.0).

   Split out from the transcoder on purpose. Cutting a video into segments needs
   ffmpeg and a machine to run it on; encrypting those segments and writing the
   .m3u8 is arithmetic and string-building. Keeping the second half pure means
   the part that decides who can decrypt what is testable without a media
   pipeline, and the part that needs one is small and dull.

   ---- The IV, and why it isn't written down ---------------------------------

   RFC 8216 §5.2: when #EXT-X-KEY carries no IV, the player uses the segment's
   MEDIA SEQUENCE NUMBER as the IV, as a 128-bit big-endian integer. So we omit
   IV and encrypt segment i with IV = i. That is not a shortcut — writing an
   explicit IV per key line would make every segment in a rotation group share
   one IV, which is the thing you must not do with CBC.
   ------------------------------------------------------------------------ */

// The IV a player will use for a segment, per the RFC: its index, big-endian,
// in 16 bytes.
export function ivForSegment(segmentIndex) {
  const iv = Buffer.alloc(16);
  // Written as a 64-bit value in the low half; a course with 2^64 segments is
  // not a case worth handling.
  iv.writeBigUInt64BE(BigInt(segmentIndex), 8);
  return iv;
}

// One segment, encrypted with its rotation group's key. PKCS#7 padding is
// Node's default for CBC and is what HLS expects.
export function encryptSegment(plain, key, segmentIndex) {
  const cipher = createCipheriv('aes-128-cbc', key, ivForSegment(segmentIndex));
  return Buffer.concat([cipher.update(plain), cipher.final()]);
}

/* Builds the stored playlist.

   URIs here are PLACEHOLDERS, not links: `key:3` for a key and a bare filename
   for a segment. The serving endpoint rewrites both into absolute, expiring
   URLs at request time. Storing real URLs would bake in a hostname, a bucket
   and an expiry — none of which are true for longer than a few minutes. */
export function buildPlaylist({ segments, rotateEvery = KEY_ROTATION_SEGMENTS }) {
  const target = Math.ceil(Math.max(0, ...segments.map((s) => s.durationSeconds || 0)));

  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${target || 1}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-PLAYLIST-TYPE:VOD',
  ];

  let lastGroup = -1;
  segments.forEach((seg, i) => {
    const group = keyGroupFor(i, rotateEvery);
    // A key line only where the key actually changes. Repeating it per segment
    // would be valid and would also make the player re-fetch the same key
    // dozens of times.
    if (group !== lastGroup) {
      lines.push(`#EXT-X-KEY:METHOD=AES-128,URI="key:${group}"`);
      lastGroup = group;
    }
    lines.push(`#EXTINF:${(seg.durationSeconds ?? 0).toFixed(3)},`);
    lines.push(seg.name);
  });

  lines.push('#EXT-X-ENDLIST');
  return `${lines.join('\n')}\n`;
}

/* Encrypts a whole set of segments and returns them with the playlist that
   describes them. Pure: hands back buffers, writes nothing. The caller uploads.

   `segments` is [{ name, data, durationSeconds }] in playback order. */
export function packageSegments({ lessonId, segments, rotateEvery = KEY_ROTATION_SEGMENTS }) {
  const keys = new Map();
  const keyFor = (group) => {
    if (!keys.has(group)) keys.set(group, deriveKey(lessonId, group));
    return keys.get(group);
  };

  const encrypted = segments.map((seg, i) => ({
    name: seg.name,
    durationSeconds: seg.durationSeconds ?? 0,
    data: encryptSegment(seg.data, keyFor(keyGroupFor(i, rotateEvery)), i),
  }));

  return {
    playlist: buildPlaylist({ segments, rotateEvery }),
    segments: encrypted,
    keyGroups: keys.size,
    rotateEvery,
  };
}

/* Rewrites a stored playlist for one request.

   `keyUrl(group)` and `segmentUrl(name)` are supplied by the caller so this
   stays free of S3 and of the router. Only the two placeholder forms are
   touched; every other line passes through untouched, which is what keeps this
   safe against a playlist we did not author. */
export function resolvePlaylist(playlist, { keyUrl, segmentUrl }) {
  return playlist
    .split('\n')
    .map((line) => {
      if (line.startsWith('#EXT-X-KEY:')) {
        return line.replace(/URI="key:(\d+)"/, (_, g) => `URI="${keyUrl(Number(g))}"`);
      }
      // A comment or a blank; only bare lines are URIs.
      if (!line || line.startsWith('#')) return line;
      return segmentUrl(line.trim());
    })
    .join('\n');
}
