// Timings for replaying the page's reveal animations when the audience toggle
// is switched.
//
// The two work together. Switching segment hides every revealed section and
// shows it again; left alone, the hide is itself animated by the same 0.7s
// transition, so the section eases a few percent out of view and straight back
// in — a flicker rather than a reveal. So:
//
//   1. transitions are suppressed for SNAP_MS, making the hide instant;
//   2. the reveal is held back until RESET_MS, by which point transitions are
//      live again and the section animates in from its start state.
//
// RESET_MS must stay comfortably above SNAP_MS or the reveal begins before
// transitions are back on and simply snaps into place.
export const REVEAL_SNAP_MS = 60;
export const REVEAL_RESET_MS = 110;
