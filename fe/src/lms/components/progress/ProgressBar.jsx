// Completion bar (L3). Used on the dashboard's resume panel and on every
// course card, so the two can never drift apart visually.
//
// `label` renders the row underneath. Pass `left`/`right` nodes, or omit it
// for a bare bar.
export default function ProgressBar({ percent = 0, left, right, complete = false }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      <span
        className="lms-progress"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          className={`lms-progress__fill${complete ? ' is-complete' : ''}`}
          style={{ width: `${value}%` }}
        />
      </span>
      {left || right ? (
        <span className="lms-progress__label">
          <span>{left}</span>
          {right}
        </span>
      ) : null}
    </div>
  );
}
