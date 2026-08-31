import { useId, useState } from 'react';

/* Minutes learned over time (L3).

   A smooth line over a green wash that fades to nothing at the baseline, with
   the hovered day marked by a dot and a dashed guide down to its label.

   It was a bar chart. Bars are the honest mark for counts on separate days and
   they were not wrong — but a row of hard dark-green rectangles is the heaviest
   thing that can be put in a card, which is exactly what this app was asked to
   stop doing. A line carries the same series at a fraction of the ink, and the
   fill under it is where the brand green gets to be a gradient without any of
   it being a slab.

   ONE SERIES, so the card title names it and there is no legend.

   Extracted from the dashboard so the 7-day view and the 12-week view are the
   same chart with different data. They were about to be two copies that
   drifted.

   `data` is `[{ day, label, dayOfMonth, minutes, current? }]`. `day` is the
   `YYYY-MM-DD` the row belongs to and is what identifies it; `label` is the
   weekday, which is a LABEL and not an identity — there are four Tuesdays in a
   month. See the note on the key below. */

// The x-axis label for a row, and how many rows to skip between labels.
//
// A weekday reads well over a week and says nothing over a quarter, where
// "Tue" appears thirteen times. Past a week the axis switches to a date, and
// past what will fit it prints every Nth — twelve labels is the most this width
// holds before they start colliding.
function axisPlan(data) {
  const n = data.length;
  const every = Math.max(1, Math.ceil(n / 12));
  if (n <= 7) return { every: 1, label: (d) => d.label };
  if (n <= 31) return { every, label: (d) => d.dayOfMonth ?? d.label };
  return {
    every,
    label: (d) =>
      d.day
        ? new Date(`${d.day}T00:00:00Z`).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
          })
        : d.label,
  };
}

function duration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/* The same, but a day with nothing on it reads "0m".

   "-" means "we have no figure for this", which is right on a card fact and
   wrong in a tooltip: the chart plots every day in the window, so a quiet
   Tuesday is a known quantity and the quantity is zero. */
function logged(minutes) {
  return minutes ? duration(minutes) : '0m';
}

/* "Fri 28 Aug" — what a reader calls a day, not what the API stores.

   The tooltip and the accessible label both printed `d.day` raw, so hovering a
   column said "2026-08-28". Parsed and read back as UTC: the string is already
   the learner's local day and letting the browser reinterpret it in its own
   timezone is what shifts a label onto the day before. */
function dayLabel(d) {
  if (!d.day) return d.label ?? '';
  return new Date(`${d.day}T00:00:00Z`).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

/* A smooth path through the points that CANNOT overshoot them.

   Monotone cubic interpolation (Fritsch–Carlson). The previous version was a
   plain Catmull-Rom spline with its tangents damped, and damping is not a fix:
   it makes overshoot smaller, never impossible. A quiet day between two busy
   ones still pulled the curve under the axis, so the chart drew a dip below
   zero — negative minutes — on the most ordinary week there is.

   Fritsch–Carlson works by limiting each tangent to the slopes on either side
   of it, so the curve is monotone wherever the data is: between two equal
   points it is flat, between a fall and a rise it turns at the point itself and
   nowhere lower. It cannot leave the interval its own endpoints define, so a
   series that never goes below zero cannot be drawn below zero.

   Two points or fewer cannot curve, so they are drawn straight. */
function smoothPath(pts) {
  const n = pts.length;
  if (n < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

  // Secant slopes between neighbours.
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }

  // Tangents: the average of the two secants at interior points, the single
  // secant at the ends.
  const m = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) m[i] = (slope[i - 1] + slope[i]) / 2;
  m[n - 1] = slope[n - 2];

  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      // A flat run stays flat. Without this the curve bulges between two equal
      // values — which on this chart means a bump on a week of nothing.
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    // The circle condition: keep (alpha, beta) inside a radius of 3, which is
    // what guarantees monotonicity on the interval.
    const alpha = m[i] / slope[i];
    const beta = m[i + 1] / slope[i];
    const s = alpha * alpha + beta * beta;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * alpha * slope[i];
      m[i + 1] = tau * beta * slope[i];
    }
  }

  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const third = dx[i] / 3;
    d += ` C${pts[i].x + third} ${pts[i].y + m[i] * third}`
      + ` ${pts[i + 1].x - third} ${pts[i + 1].y - m[i + 1] * third}`
      + ` ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

export default function ActivityChart({ data, caption = 'Minutes learned', step = 30 }) {
  const [hover, setHover] = useState(null);
  // The fill gradient is defined inside this SVG and referenced by id. Two
  // charts on one page would otherwise share one id, and the second would paint
  // with whichever set of stops the browser resolved first.
  const gradientId = `lms-area-${useId().replace(/:/g, '')}`;

  // The viewBox is sized close to the width these cards actually get on a
  // laptop, so the browser scales it by roughly 1 and the axis text renders at
  // its nominal size. A small viewBox stretched to full width blows the labels
  // up with it.
  const W = 1200;
  const H = 280;
  const PAD = { top: 30, right: 18, bottom: 34, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const peak = Math.max(...data.map((d) => d.minutes));
  // Round the ceiling up to whole steps so the gridlines land on times a reader
  // recognises.
  const max = Math.max(step, Math.ceil(peak / step) * step);
  const ticks = [0, max / 3, (max / 3) * 2, max];

  const best = data.reduce((a, b) => (b.minutes > a.minutes ? b : a), data[0]);
  const bestIndex = data.indexOf(best);
  const axis = axisPlan(data);

  const y = (v) => PAD.top + plotH - (v / max) * plotH;

  /* The series spans the plot EDGE TO EDGE.

     Each point used to sit at the centre of its own band, which left half a
     band of blank plot at each end — so the fill stopped short of the right
     gridline and closed with a hard vertical edge in the middle of the card.
     Against a steep final rise that read as a wedge stuck to the chart rather
     than as a series running off the end of the week.

     First point on the left gridline, last on the right, the rest spaced
     evenly between. `band` is now only the width of a hit target. */
  const span = data.length > 1 ? plotW / (data.length - 1) : 0;
  const x = (i) => (data.length > 1 ? PAD.left + span * i : PAD.left + plotW / 2);
  const band = data.length > 1 ? span : plotW;

  const points = data.map((d, i) => ({ x: x(i), y: y(d.minutes) }));
  const line = smoothPath(points);
  // The fill is the line, dropped to the baseline at both ends and closed.
  const area = `${line} L${points[points.length - 1].x} ${y(0)} L${points[0].x} ${y(0)} Z`;

  return (
    <div className="lms-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption}>
        <defs>
          {/* Brand green at the top of the curve, gone by the axis. The stops
              fall away steeply on purpose: a fill still visible at the baseline
              reads as a block with a lid rather than as a series settling. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14572a" stopOpacity="0.24" />
            <stop offset="55%" stopColor="#3da05c" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#7ee2a8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line className="lms-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="lms-chart__axis" x={PAD.left - 12} y={y(t) + 4} textAnchor="end">
              {t === 0 ? '0' : duration(Math.round(t))}
            </text>
          </g>
        ))}

        <path className="lms-chart__area" d={area} fill={`url(#${gradientId})`} />
        <path className="lms-chart__line" d={line} />

        {/* The best day is labelled outright; every other answers to the
            pointer. One number on the chart is orientation, thirty is a table. */}
        {best.minutes > 0 ? (
          <g className="lms-chart__peak">
            <circle cx={x(bestIndex)} cy={y(best.minutes)} r="4.5" />
            <text
              className="lms-chart__value"
              x={x(bestIndex)}
              y={y(best.minutes) - 14}
              textAnchor="middle"
            >
              {duration(best.minutes)}
            </text>
          </g>
        ) : null}

        {data.map((d, i) => {
          const isHovered = hover != null && (hover.day ?? hover.label) === (d.day ?? d.label);
          return (
            <g
              /* `d.day`, not `d.label`. The label is a weekday, unique across
                 seven days and repeating over any longer window — and React
                 keyed on it reconciled two different Tuesdays into one, which
                 left the 30-day view drawing 37 columns and the 7-day view
                 refusing to shrink back. `day` is one row's date and cannot
                 collide. */
              key={d.day ?? d.label}
              className="lms-chart__col"
              tabIndex={0}
              role="img"
              aria-label={`${dayLabel(d)}: ${logged(d.minutes)}`}
              onMouseEnter={() => setHover({ ...d, cx: x(i), top: y(d.minutes) })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ ...d, cx: x(i), top: y(d.minutes) })}
              onBlur={() => setHover(null)}
            >
              {/* A full-height transparent target, so the hit area is far bigger
                  than the mark, including on zero-minute days where there is no
                  mark at all to aim at. */}
              <rect
                className="lms-chart__hit"
                x={Math.max(PAD.left, x(i) - band / 2)}
                y={PAD.top}
                width={Math.min(x(i) + band / 2, W - PAD.right) - Math.max(PAD.left, x(i) - band / 2)}
                height={plotH}
                rx="8"
              />

              {isHovered ? (
                <>
                  <line className="lms-chart__guide" x1={x(i)} x2={x(i)}
                    y1={y(d.minutes)} y2={y(0)} />
                  <circle className="lms-chart__dot" cx={x(i)} cy={y(d.minutes)} r="5.5" />
                </>
              ) : null}

              {/* Thinned on the long views, so the labels do not overlap into
                  a grey smear. Every column still announces its own date to a
                  screen reader through the group's aria-label above. */}
              {i % axis.every === 0 ? (
                <text
                  className={`lms-chart__axis${isHovered ? ' is-active' : ''}`}
                  x={x(i)}
                  y={H - 12}
                  textAnchor="middle"
                >
                  {axis.label(d)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hover ? (
        <div
          className="lms-chart__tip"
          style={{
            left: `${(hover.cx / W) * 100}%`,
            top: `${(hover.top / H) * 100}%`,
            marginTop: -16,
          }}
        >
          {dayLabel(hover)} · <strong>{logged(hover.minutes)}</strong>
        </div>
      ) : null}

      {/* The same numbers as a table, for screen readers and for anyone who
          would rather read than hover. */}
      <table className="lms-sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr><th scope="col">Period</th><th scope="col">Time learned</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day ?? d.label}>
              <th scope="row">{dayLabel(d)}</th>
              <td>{logged(d.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
