import { AUDIENCE } from '../../constants/audiences.js';
import { REVEAL_SNAP_MS } from '../../constants/motion.js';
import { useAudience } from '../../context/AudienceContext.jsx';

// `hint` says who each segment is for, so the choice doesn't rest on the label
// alone. It's hidden in the compact placements (see .audience-toggle--plain).
const OPTIONS = [
  { value: AUDIENCE.AWARD, label: 'Award Contracts', hint: 'For agencies & officials' },
  { value: AUDIENCE.WIN, label: 'Win Contracts', hint: 'For suppliers & bidders' },
];

export default function AudienceToggle({ plain = false }) {
  const { audience, setAudience } = useAudience();

  // Switching segment replays every reveal on the page. Two things have to
  // happen for that to be watchable: go back to the top, so the reveals aren't
  // playing above the visitor's scroll position, and suppress transitions for a
  // moment so sections snap to their hidden state rather than easing out of it
  // (see constants/motion.js).
  const pick = (value) => {
    if (value === audience) return;

    const root = document.documentElement;
    root.dataset.revealReset = '';
    setAudience(value);
    window.scrollTo({ top: 0, behavior: 'auto' });
    window.setTimeout(() => {
      delete root.dataset.revealReset;
    }, REVEAL_SNAP_MS);
  };

  return (
    <div
      className={`audience-toggle${plain ? ' audience-toggle--plain' : ''}`}
      role="group"
      aria-label="Choose your pathway"
    >
      {OPTIONS.map(({ value, label, hint }) => {
        const isActive = audience === value;

        return (
          <button
            key={value}
            type="button"
            className={`audience-toggle__option${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => pick(value)}
          >
            <span className="audience-toggle__label">{label}</span>
            {!plain && <span className="audience-toggle__hint">{hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
