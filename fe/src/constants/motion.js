// Reveal and segment-swap timings.
//
// REVEAL_RESET_MS holds a section's reveal back for a beat after it is hidden.
// A section already on screen reports as intersecting in the same frame it was
// hidden, so observing it straight away reveals it again before the hidden
// state has been painted — and the animation is a flicker rather than a fade.
// The wait costs nothing on a section the visitor still has to scroll to.
//
// There used to be a REVEAL_SNAP_MS alongside it, which suppressed transitions
// while the audience toggle replayed every reveal on the page. Nothing replays
// on the toggle any more — see the note on the cross-fade below — so it had
// nothing left to suppress.
export const REVEAL_RESET_MS = 110;

export const SWAP_FADE_OUT_MS = 380;
export const SWAP_FADE_IN_MS = 640;
