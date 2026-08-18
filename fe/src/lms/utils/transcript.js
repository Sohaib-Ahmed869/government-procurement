// Transcript helpers (L2). Cues are `{ t, text }` with `t` in seconds, sorted
// ascending. The shape the API will return.

// The cue covering `time`: the last one whose start is at or before it. Returns
// -1 before the first cue starts.
export function activeCueIndex(cues, time) {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].t <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

// 0:07 / 1:04:07
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}

// Plain-text export of the whole transcript, for the download action.
export function transcriptToText(cues) {
  return cues.map((c) => `[${formatTime(c.t)}] ${c.text}`).join('\n');
}
