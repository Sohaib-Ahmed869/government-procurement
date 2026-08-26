/* A page title that says something different on each side of the audience
   toggle, WITHOUT the heading band changing height when the toggle is pressed.

   The band is sized by its title: styles/head.css gives it a floor
   (--gp-head-min) and centres what it holds, so a title that fits on one line
   makes a 90px strip and one that wraps to two makes a 136px one. That is fine
   until the two segments carry different words — How to Engage Us is "Talk to
   Us Directly" on Win and "Panel, Prequalification, Direct Negotiation, and
   Contractor" on Award — because then pressing the toggle changes the height of
   the strip halfway through the cross-fade. It reads as the page glitching, and
   it moves everything below it while the reader is looking at it.

   The fix is to size the band by the LONGEST of the titles in every segment.
   Both are rendered, stacked in the same grid cell, and the one that is not the
   current segment's is `visibility: hidden` — laid out, measured, invisible. The
   cell is as tall as the taller of the two, in both segments, at every width and
   in every browser.

   Deliberately not a min-height in pixels: where the two wrap depends on the
   viewport, the font and the segment, so any number picked here would be right
   at one width and wrong at the rest. Letting the browser measure the real text
   is the only version of this that cannot drift.

   The ghost is `aria-hidden` and the real title is a normal text node, so a
   screen reader reads one heading — the segment's own. */

export default function SegmentTitle({ as: Tag = 'h1', className = '', titles, audience, fallback }) {
  const keys = Object.keys(titles);
  const active = audience in titles ? audience : (fallback ?? keys[0]);
  const current = titles[active];

  // Only the titles that differ from the one on screen need reserving. Where
  // both segments say the same thing there is nothing to stack and no ghost is
  // drawn.
  const ghosts = keys.filter((k) => k !== active && titles[k] !== current).map((k) => titles[k]);

  return (
    <Tag className={`seg-title ${className}`.trim()}>
      <span className="seg-title__text">{current}</span>
      {ghosts.map((text) => (
        <span className="seg-title__ghost" aria-hidden="true" key={text}>
          {text}
        </span>
      ))}
    </Tag>
  );
}
