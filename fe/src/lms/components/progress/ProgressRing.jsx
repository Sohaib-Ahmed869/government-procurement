// A single proportion as a ring (L3). The one headline number on the progress
// page. A ring rather than another bar so the overall figure reads as a summary
// of the bars beneath it rather than one more of them.
//
// The value is also written in the middle, so it never depends on reading an
// arc, and the whole thing is labelled for screen readers.
export default function ProgressRing({ percent, label, sublabel, size = 148 }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="lms-ring" style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${value}%`}
      >
        <circle
          className="lms-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
        />
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
      </svg>
      <div className="lms-ring__center">
        <span className="lms-ring__value">{value}%</span>
        {sublabel ? <span className="lms-ring__sub">{sublabel}</span> : null}
      </div>
    </div>
  );
}
