const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

// Star rating (L5), in two modes.
//
// Read-only it is a single labelled image. Five separate stars announced one
// by one is noise to a screen reader. Interactive it is a real radio group, so
// it is reachable and settable from the keyboard, which a row of clickable
// spans would not be.
export default function RatingStars({ value = 0, onChange, size = 'md', count }) {
  const interactive = typeof onChange === 'function';
  const rounded = Math.round(value);

  const star = (filled, i) => (
    <svg key={i} viewBox="0 0 24 24" className={`lms-star${filled ? ' is-on' : ''}`} aria-hidden="true">
      <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z" />
    </svg>
  );

  if (!interactive) {
    return (
      <span className={`lms-stars lms-stars--${size}`} role="img"
        aria-label={`${value} out of 5${count != null ? `, ${count} reviews` : ''}`}>
        {[1, 2, 3, 4, 5].map((i) => star(i <= rounded, i))}
        {count != null ? <span className="lms-stars__count">({count})</span> : null}
      </span>
    );
  }

  return (
    <span className={`lms-stars lms-stars--${size} is-interactive`} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <label key={i} className="lms-star__label" title={LABELS[i]}>
          <input
            type="radio"
            name="rating"
            value={i}
            checked={value === i}
            onChange={() => onChange(i)}
            className="lms-sr-only"
          />
          {star(i <= value, i)}
          <span className="lms-sr-only">{`${i}: ${LABELS[i]}`}</span>
        </label>
      ))}
      {value ? <span className="lms-stars__label">{LABELS[value]}</span> : null}
    </span>
  );
}
