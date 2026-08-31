/* A donut and its legend.

   One ring, one legend, and a total in the middle — the middle is the whole
   reason to use a donut rather than a pie: a ring with a hole has somewhere to
   put the number the slices add up to, which is usually the figure a reader
   wanted first.

   The palette is the LMS greens stepping from dark to light, not a set of
   unrelated hues. The slices are parts of ONE quantity, so they should read as
   shades of one thing; a rainbow would suggest five unrelated categories. Six
   steps, because past that the lightest is white on white — anything beyond is
   collected into a final "Other" slice by the caller.

   The ring is thin, round-capped and gapped rather than a solid band, and it is
   drawn on a pale track. A thick unbroken ring of six greens is one heavy shape
   with seams; separated on a track, each segment is a mark of its own and the
   gaps read as spacing rather than as pieces missing.

   `data` is `[{ id, label, value }]`, largest first. */

/* Dark to light. The largest slice takes the darkest step, so weight on the
   page follows weight in the data.

   The ramp starts at #14572a, not the near-black #0a3114 it used to. A ring is
   a solid shape however thin it is drawn, and at brand-black the biggest
   segment was the heaviest mark on the dashboard — on a page whose whole brief
   was to be light. Every step is still unmistakably the brand green and each is
   a clear step from its neighbour. */
const SHADES = ['#14572a', '#2f8a4d', '#4faf70', '#7ac794', '#a6dcb9', '#cdecd9'];

// Drawn as stroked arcs on one circle rather than as filled wedge paths:
// `stroke-dasharray` on a circle is one number per slice and cannot produce the
// hairline seams that abutting filled paths do at some sizes.
const SIZE = 180;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/* The gap you actually SEE between one segment and the next, in user units.

   The ends are ROUND, and a round cap bulges half a stroke width past where the
   arc stops — at both ends. So a segment shortened by G renders only G − STROKE
   of visible space. The first attempt shortened by 10 against a stroke of 18,
   which is negative: the caps overlapped and the ring came out solid with a
   faint notch in it.

   This is the visible figure and the stroke is added back below, so changing
   the ring's thickness cannot silently close the gaps again. */
const VISIBLE_GAP = 11;

// However many slices there are, the gaps must not eat the ring. Past about a
// fifth of the circumference it stops reading as a divided whole and starts
// reading as a dotted line.
const MAX_GAP_SHARE = 0.22;

export default function DonutChart({ data, total, totalLabel, caption }) {
  const sum = data.reduce((n, d) => n + d.value, 0);
  if (!sum) return null;

  // A single slice is the whole ring; a gap in it would read as a ring that
  // failed to close rather than as one segment.
  const wanted = VISIBLE_GAP + STROKE;
  const gap =
    data.length > 1
      ? Math.min(wanted, (CIRCUMFERENCE * MAX_GAP_SHARE) / data.length)
      : 0;

  let offset = 0;
  const slices = data.map((d, i) => {
    const fraction = d.value / sum;
    const length = fraction * CIRCUMFERENCE;
    const slice = {
      ...d,
      colour: SHADES[Math.min(i, SHADES.length - 1)],
      percent: Math.round(fraction * 100),
      // Never shorter than a round cap, or the arc inverts and the segment is
      // drawn as a lozenge pointing the wrong way.
      dash: Math.max(length - gap, 0.6),
      offset,
    };
    offset += length;
    return slice;
  });

  return (
    <div className="lms-donut">
      <div className="lms-donut__ring">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={caption}>
          {/* Rotated so the first slice starts at twelve o'clock; SVG arcs
              begin at three. */}
          {/* A track behind the segments, so the ring reads as one circle with
              parts marked on it rather than as loose arcs floating in a card.
              It is what makes the gaps look deliberate. */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--lms-tint-100)"
            strokeWidth={STROKE}
          />
          <g className="lms-donut__segments" transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {slices.map((s) => (
              <circle
                key={s.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={s.colour}
                strokeWidth={STROKE}
                strokeLinecap={data.length > 1 ? 'round' : 'butt'}
                strokeDasharray={`${s.dash} ${CIRCUMFERENCE - s.dash}`}
                strokeDashoffset={-s.offset}
              />
            ))}
          </g>
        </svg>
        <span className="lms-donut__centre">
          <strong>{total ?? sum}</strong>
          <span>{totalLabel}</span>
        </span>
      </div>

      {/* A real list, not a row of coloured divs: this IS the data, and it is
          the only way to read the chart without distinguishing six greens. */}
      <ul className="lms-donut__legend">
        {slices.map((s) => (
          <li key={s.id}>
            <span className="lms-donut__swatch" style={{ background: s.colour }} aria-hidden="true" />
            <span className="lms-donut__label">{s.label}</span>
            <span className="lms-donut__value">
              {s.value}
              <span className="lms-donut__pct">{s.percent}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
