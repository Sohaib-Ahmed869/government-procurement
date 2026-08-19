import { AUDIENCE } from '../../constants/audiences.js';
import { useAudience } from '../../context/AudienceContext.jsx';

// `hint` says who each segment is for, so the choice doesn't rest on the label
// alone. It's hidden in the compact placements (see .audience-toggle--plain).
const OPTIONS = [
  { value: AUDIENCE.AWARD, label: 'Award Contracts', hint: 'For agencies and officials' },
  { value: AUDIENCE.WIN, label: 'Win Contracts', hint: 'For suppliers and bidders' },
];

export default function AudienceToggle({ plain = false }) {
  const { audience, setAudience } = useAudience();

  // The transition itself belongs to the provider (see AudienceContext), so
  // every route for a segment switch plays the same cross-fade and the page
  // holds its scroll position. All the button does is name the segment.
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
            onClick={() => setAudience(value)}
          >
            <span className="audience-toggle__label">{label}</span>
            {!plain && <span className="audience-toggle__hint">{hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
