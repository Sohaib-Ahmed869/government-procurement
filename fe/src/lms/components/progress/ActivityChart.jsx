import { useState } from 'react';

/* Minutes learned over time (L3).

   One series, so the card title names it and no legend is needed. Bars are a
   single brand hue anchored to the baseline with rounded tops; the grid stays
   recessive; only the best bar carries a direct label and the rest reveal their
   value on hover or keyboard focus.

   Extracted from the dashboard so the 7-day view and the 12-week view are the
   same chart with different data. They were about to be two copies that
   drifted.

   `data` is `[{ label, minutes, current? }]`. */

function duration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function ActivityChart({ data, caption = 'Minutes learned', step = 30 }) {
  const [hover, setHover] = useState(null);

  // The viewBox is sized close to the width these cards actually get on a
  // laptop, so the browser scales it by roughly 1 and the axis text renders at
  // its nominal size. A small viewBox stretched to full width blows the labels
  // up with it.
  const W = 1200;
  const H = 280;
  const PAD = { top: 20, right: 12, bottom: 34, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const peak = Math.max(...data.map((d) => d.minutes));
  // Round the ceiling up to whole steps so the gridlines land on times a reader
  // recognises.
  const max = Math.max(step, Math.ceil(peak / step) * step);
  const ticks = [0, max / 3, (max / 3) * 2, max];

  const band = plotW / data.length;
  // Thin marks: the bar narrows as the series gets longer, but never past the
  // point where it stops reading as a bar.
  const barW = Math.max(14, Math.min(34, band * 0.42));
  const best = data.reduce((a, b) => (b.minutes > a.minutes ? b : a), data[0]);

  const y = (v) => PAD.top + plotH - (v / max) * plotH;

  return (
    <div className="lms-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="lms-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="lms-chart__axis" x={PAD.left - 12} y={y(t) + 4} textAnchor="end">
              {t === 0 ? '0' : duration(Math.round(t))}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2;
          const barH = (d.minutes / max) * plotH;
          const isBest = d.minutes === best.minutes && d.minutes > 0;
          return (
            <g
              key={d.label}
              className="lms-chart__col"
              tabIndex={0}
              role="img"
              aria-label={`${d.label}: ${duration(d.minutes)}`}
              onMouseEnter={() => setHover({ ...d, cx, top: y(d.minutes) })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ ...d, cx, top: y(d.minutes) })}
              onBlur={() => setHover(null)}
            >
              {/* A full-height transparent target, so the hit area is far bigger
                  than the mark, including on zero-minute periods. */}
              <rect className="lms-chart__hit" x={cx - band / 2} y={PAD.top}
                width={band} height={plotH} rx="8" />
              {d.minutes > 0 ? (
                <rect
                  className={`lms-chart__bar${d.current ? ' lms-chart__bar--today' : ''}`}
                  x={cx - barW / 2}
                  y={y(d.minutes)}
                  width={barW}
                  height={barH}
                  rx="4"
                />
              ) : null}
              {isBest ? (
                <text className="lms-chart__value" x={cx} y={y(d.minutes) - 8} textAnchor="middle">
                  {duration(d.minutes)}
                </text>
              ) : null}
              <text className="lms-chart__axis" x={cx} y={H - 12} textAnchor="middle">
                {d.label}
              </text>
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
            marginTop: -10,
          }}
        >
          {hover.label} · <strong>{duration(hover.minutes)}</strong>
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
            <tr key={d.label}><th scope="row">{d.label}</th><td>{duration(d.minutes)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
