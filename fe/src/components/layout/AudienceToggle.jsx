import { AUDIENCE } from '../../constants/audiences.js';
import { useAudience } from '../../context/AudienceContext.jsx';

const OPTIONS = [
  { value: AUDIENCE.AWARD, label: 'Award contracts' },
  { value: AUDIENCE.WIN, label: 'Win contracts' },
];

export default function AudienceToggle() {
  const { audience, setAudience } = useAudience();

  return (
    <div className="audience-toggle" role="group" aria-label="Choose your audience">
      {OPTIONS.map(({ value, label }) => {
        const isActive = audience === value;

        return (
          <button
            key={value}
            type="button"
            className={`audience-toggle__option${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => setAudience(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
