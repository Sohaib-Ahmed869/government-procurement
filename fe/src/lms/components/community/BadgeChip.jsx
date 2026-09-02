import LmsIcon from '../LmsIcon.jsx';

/* One badge (L5).

   THE MEDAL IS GONE. It was a 46px circle filled with a bronze/silver/gold
   gradient, holding the badge's icon — an ornament that told the reader one
   thing (the tier) in a way only a sighted reader who knows the metals could
   decode, and that told a LOCKED badge's reader nothing at all: locked chips
   drew a grey circle with a padlock, so the tier of the badge you were chasing
   was the one fact the card withheld.

   The tier is now written. Every card says "Bronze", "Silver" or "Gold" in a
   tinted pill, earned or not, and the card's left edge carries a rule in the
   same metal. Colour still separates the three at a glance; the word means it
   no longer has to. The icon stays, drawn on the card's own surface at the
   tier's tone rather than reversed out of a filled blob. */
export default function BadgeChip({ badge }) {
  const { earned, tier, tierMeta, name, description, icon, value, target, percent } = badge;

  return (
    <div
      className={`lms-badge is-${tier}${earned ? ' is-earned' : ' is-locked'}`}
      title={earned ? `${name} (earned)` : `${name} (${value} of ${target})`}
    >
      <span className="lms-badge__mark">
        <LmsIcon name={earned ? icon : 'lock'} />
      </span>

      <span className="lms-badge__body">
        <span className="lms-badge__name">{name}</span>
        <span className="lms-badge__desc">{description}</span>

        <span className="lms-badge__foot">
          <span className="lms-badge__tier">{tierMeta.label}</span>
          {earned ? (
            <span className="lms-badge__points">{badge.points} pts</span>
          ) : (
            <>
              <span className="lms-progress">
                <span className="lms-progress__fill" style={{ width: `${percent}%` }} />
              </span>
              <span className="lms-badge__count">
                {value}/{target}
              </span>
            </>
          )}
        </span>
      </span>
    </div>
  );
}
