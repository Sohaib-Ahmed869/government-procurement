// Name handling.
//
// Honorifics are the whole reason this exists: "Dr. Helen Marsh" greeted by
// first word is "Dr", and initialled naively is "DH". Both were happening.
const HONORIFICS = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'prof', 'professor', 'sir', 'rev']);

function meaningfulParts(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !HONORIFICS.has(p.replace(/\./g, '').toLowerCase()));
}

// The name to greet someone by. Falls back rather than returning an empty
// string, so a greeting never opens on a blank where a name should be.
export function firstNameOf(name, fallback = 'there') {
  return meaningfulParts(name)[0] || fallback;
}

// Up to two letters for an avatar chip.
export function initialsOf(name, fallback = '?') {
  const parts = meaningfulParts(name);
  if (!parts.length) return fallback;
  return ((parts[0][0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}
