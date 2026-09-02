// A single proportion as a ring (L3). The one headline number on the progress
// page. A ring rather than another bar so the overall figure reads as a summary
// of the bars beneath it rather than one more of them.
//
// The value is also written in the middle, so it never depends on reading an
// arc, and the whole thing is labelled for screen readers.
// `stroke` is a prop rather than a constant because the ring is drawn at two
// sizes: 148px as the progress page's headline, and 108px in the dashboard's
// gauge panel, where a 12px band on a smaller circle closes most of the hole
// the number sits in.
// `display` overrides what is written in the hole. The arc is always a
// percentage — that is what an arc IS — but the figure it stands for is not
// always a percentage: an average rating of 4.6 out of 5 draws a 92% arc, and
// writing "92%" in the middle of it would be a number the instructor never
// asked about. The arc shows the proportion, the text shows the reading.
export default function ProgressRing({ percent, label, sublabel, size = 148, stroke = 12, display }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="lms-ring" style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${display ?? `${value}%`}`}
      >
        <circle
          className="lms-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
        />
        {/* Nothing done draws nothing. A round cap on a zero-length dash still
            renders as a dot at twelve o'clock — a mark of progress on a ring
            whose whole point is that there is none. */}
        {value > 0 ? (
          <circle
            className="lms-ring__fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={`${(value / 100) * c} ${c}`}
            strokeLinecap="round"
            /* Start at twelve o'clock instead of three. */
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </svg>
      <div className="lms-ring__center">
        <span className="lms-ring__value">{display ?? `${value}%`}</span>
        {sublabel ? <span className="lms-ring__sub">{sublabel}</span> : null}
      </div>
    </div>
  );
}
