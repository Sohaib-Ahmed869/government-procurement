// The single place that turns "can this learner open this lesson?" into one
// answer. Enrolment (L6), drip scheduling and prerequisites (L4) and free
// previews (L1) all end up here, so no screen has to re-derive lock state and
// no two screens can disagree about it.
//
// The server resolves the gate. It holds the drip schedule and the learner's
// prerequisite completions, and sends it down as `{ reason, ... }`. These
// helpers interpret that payload for display.

export const GATE = {
  OPEN: 'open',
  PREVIEW: 'preview',
  DRIP: 'locked-drip',
  PREREQ: 'locked-prereq',
  ENROLMENT: 'locked-enrolment',
};

export function isLocked(gate) {
  if (!gate) return false;
  return gate.reason !== GATE.OPEN && gate.reason !== GATE.PREVIEW;
}

// Short human sentence for a lock, e.g. "Unlocks 19 Aug" or "Complete Module 2
// first". Returns null when nothing is locked, so callers can render nothing.
export function gateLabel(gate) {
  if (!gate || !isLocked(gate)) return null;
  switch (gate.reason) {
    case GATE.DRIP:
      return gate.unlocksOn
        ? `Unlocks ${new Date(gate.unlocksOn).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            // Drip dates are business dates set by the instructor, not moments
            // in the learner's day. Pinning the timezone stops a release dated
            // the 19th from reading as the 18th for anyone west of AEST.
            timeZone: 'Australia/Sydney',
          })}`
        : 'Scheduled to unlock later';
    case GATE.PREREQ:
      return gate.requires ? `Complete ${gate.requires} first` : 'Prerequisite not met';
    case GATE.ENROLMENT:
      return 'Enrol to unlock';
    default:
      return 'Locked';
  }
}

// A button-width version of the above. A prerequisite names a whole course and
// is far too long for a button, so it collapses to "Locked" and the full
// sentence goes on the title attribute and into the card body.
export function gateShortLabel(gate) {
  if (!gate || !isLocked(gate)) return null;
  return gate.reason === GATE.DRIP ? gateLabel(gate) : 'Locked';
}

// Which icon a lock should wear. Drip is a clock, the rest are padlocks.
export function gateIcon(gate) {
  return gate?.reason === GATE.DRIP ? 'clock' : 'lock';
}

/* ---- Drip dates ------------------------------------------------------------
   A drip date is a BUSINESS DATE the instructor set, not a moment in anyone's
   day — the same premise gateLabel() above is written on, which is why it pins
   its formatting to Australia/Sydney.

   The authoring side has to honour that or the two disagree. `<input type=
   "date">` hands back a bare "2026-09-19", and `new Date("2026-09-19")` reads
   it as UTC midnight — 10am in Sydney. A module the builder says opens on the
   19th would sit locked all that morning, and an author working from London
   would set a date that fires on the 18th local. So the calendar date is
   converted to the instant that IS midnight in Sydney, and read back the same
   way, rather than through whatever clock the author's laptop happens to keep. */
const DRIP_TZ = 'Australia/Sydney';

// How many minutes ahead of UTC the drip zone is at a given instant. Derived
// rather than hardcoded, because it is +10 for half the year and +11 for the
// other half.
function dripOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DRIP_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  // Some ICU builds render midnight as hour 24 under hour12:false.
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

// "2026-09-19" -> the ISO instant of midnight that day in the drip zone.
export function dripDateToIso(ymd) {
  if (!ymd) return null;
  const naive = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  // Twice: the first correction can carry us across a DST boundary, where the
  // offset that applies is the one on the far side of it.
  const first = new Date(naive.getTime() - dripOffsetMinutes(naive) * 60000);
  return new Date(naive.getTime() - dripOffsetMinutes(first) * 60000).toISOString();
}

// The inverse, for putting a stored schedule back into the date input.
export function isoToDripDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // en-CA formats as YYYY-MM-DD, which is what the input wants.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DRIP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Long form for the builder, where there is room for the year. gateLabel()'s
// short form is for a lesson row and deliberately drops it.
export function dripDateLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: DRIP_TZ,
  });
}

// Which of the three schedules a module is on. One place, so the scheduler and
// the header chip cannot read the same module differently.
export function dripModeOf(mod) {
  if (mod?.releaseAt) return 'date';
  if (mod?.releaseAfterDays) return 'days';
  return 'now';
}

// The chip on a module header: short enough for a 330px rail.
export function dripSummary(mod) {
  const mode = dripModeOf(mod);
  if (mode === 'date') return `Opens ${dripDateLabel(mod.releaseAt)}`;
  if (mode === 'days') {
    return `Opens ${mod.releaseAfterDays} ${mod.releaseAfterDays === 1 ? 'day' : 'days'} after enrolling`;
  }
  return '';
}
