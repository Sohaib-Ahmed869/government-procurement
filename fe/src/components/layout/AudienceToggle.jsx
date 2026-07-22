import { AUDIENCE } from '../../constants/audiences.js';
import { useAudience } from '../../context/AudienceContext.jsx';
import awardIcon from '../../assets/icons/AwardsContracts.png';
import winIcon from '../../assets/icons/WinContracts.png';

const OPTIONS = [
  { value: AUDIENCE.AWARD, label: 'Award Contracts', icon: awardIcon },
  { value: AUDIENCE.WIN, label: 'Win Contracts', icon: winIcon },
];

export default function AudienceToggle() {
  const { audience, setAudience } = useAudience();

  return (
    <div className="audience-toggle" role="group" aria-label="Choose your audience">
      {OPTIONS.map(({ value, label, icon }) => {
        const isActive = audience === value;

        return (
          <button
            key={value}
            type="button"
            className={`audience-toggle__option${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => setAudience(value)}
          >
            {isActive && (
              // Black source PNG recoloured to the text colour via CSS mask.
              <span
                className="audience-toggle__icon"
                style={{ maskImage: `url(${icon})`, WebkitMaskImage: `url(${icon})` }}
                aria-hidden="true"
              />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
