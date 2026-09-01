// The wait: announced, not drawn, and holding its space.
//
// Every CMS-backed section used to print a "Loading insights…" line while it
// waited, and the line was the thing that made an arrival look abrupt: a
// sentence sat on the page, vanished, and a grid of cards took its place. The
// sections now hold their reveal until the content is in hand (the `ready`
// option in hooks/useInView.js and hooks/useMountReveal.js) and fade it in, so
// the animation IS the "it's coming" signal and the sentence is redundant.
//
// ---- Two things a removed line stops doing ---------------------------------
//
// It is redundant only if you can SEE it. The status paragraph below keeps the
// wait in the accessibility tree with none of it on screen.
//
// And an empty section is a SHORT section. `.page-layout` is a flex column a
// viewport tall (index.css), so with nothing in the middle the footer's
// "Remain Connected" band is pulled up to the bottom of the window — then
// dropped out of sight the moment the content lands. The band did not move
// because anything moved it; it was never meant to be there. So the wait also
// holds a viewport of empty space, which puts the footer where it will end up
// — below the fold — and leaves it there. Nothing on screen shifts when the
// content arrives; it simply fades in above a footer that never came up.
//
// One viewport rather than a measured height on purpose: over-reserving costs
// nothing (the footer is off screen either way, and the spacer is gone the
// frame the content mounts), while under-reserving puts the band back on the
// fold. `--gp-scale` divides it back down inside the big-screen `zoom` subtree,
// where a `vh` is magnified — the same correction `.page-layout` makes.
export default function LoadingStatus({ loading, label = 'Loading', hold = true }) {
  return (
    <>
      {/* Rendered whether or not it is loading, with the TEXT changing rather
          than the element appearing: a live region has to be in the document
          before its contents change for a screen reader to reliably announce
          the change. Mounted with its message already in it, the announcement
          is missed as often as not. */}
      <p className="gp-sr-only" role="status">
        {loading ? `${label}…` : ''}
      </p>

      {loading && hold ? <div className="gp-hold" aria-hidden="true" /> : null}
    </>
  );
}
