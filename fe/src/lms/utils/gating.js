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
