import LmsIcon from '../LmsIcon.jsx';

// One badge (L5). Earned it is coloured by tier; locked it is greyed with a
// progress bar showing how close it is. A locked badge with no indication of
// what would unlock it is just a tease.
export default function BadgeChip({ badge }) {
  const { earned, tier, tierMeta, name, description, icon, value, target, percent } = badge;

  return (
    <div
      className={`lms-badge is-${tier}${earned ? ' is-earned' : ' is-locked'}`}
      title={earned ? `${name} (earned)` : `${name} (${value} of ${target})`}
    >
      <span className="lms-badge__medal">
        <LmsIcon name={earned ? icon : 'lock'} />
      </span>

      <span className="lms-badge__body">
        <span className="lms-badge__name">{name}</span>
        <span className="lms-badge__desc">{description}</span>

        {earned ? (
          <span className="lms-badge__tier">
            {tierMeta.label} · {badge.points} pts
          </span>
        ) : (
          <span className="lms-badge__progress">
            <span className="lms-progress">
              <span className="lms-progress__fill" style={{ width: `${percent}%` }} />
            </span>
            <span className="lms-badge__count">
              {value}/{target}
            </span>
          </span>
        )}
      </span>
    </div>
  );
}
