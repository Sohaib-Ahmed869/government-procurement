/* A proportion as a row of discrete segments rather than one filled strip.

   The same argument DonutChart makes for a gapped ring: separated on a track,
   each segment is a mark of its own and the gaps read as spacing rather than as
   something missing. It also makes the figure countable — "7 of 10 lit" is read
   off the bar itself, where the end of a solid fill has to be estimated against
   the track.

   `segments` is the denominator when there is a natural one to count. Days in a
   week get seven, so one segment is one day and the bar is the week; anything
   without a countable whole gets the default ten, where a segment is 10%.

   Rounding is deliberate in both directions. A learner who has started
   something gets at least one segment, so "1 of 40 lessons" is not an empty bar
   that says they have not begun; and nothing short of the whole thing fills the
   last one, so a bar reads as complete only when it is. */
export default function SegmentBar({ percent = 0, segments = 10, tone = '', label }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const exact = (value / 100) * segments;
  let lit = Math.round(exact);
  if (value > 0 && lit === 0) lit = 1;
  if (value < 100 && lit === segments) lit = segments - 1;

  return (
    <span
      className={`lms-segbar${tone ? ` is-${tone}` : ''}`}
      role="img"
      aria-label={label ? `${label}: ${value}%` : `${value}%`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={`lms-segbar__seg${i < lit ? ' is-on' : ''}`} />
      ))}
    </span>
  );
}
