// Badge tiers (L5). A tier sets the badge's look and what it is worth; the
// levels below turn accumulated points into a standing.
export const TIERS = {
  bronze: { key: 'bronze', label: 'Bronze', points: 10 },
  silver: { key: 'silver', label: 'Silver', points: 25 },
  gold: { key: 'gold', label: 'Gold', points: 50 },
};

// Thresholds are deliberately close together at the bottom: the first two
// levels should be reachable in a first session, or the scheme reads as
// unreachable and stops motivating anyone.
export const LEVELS = [
  { min: 0, name: 'Newcomer' },
  { min: 25, name: 'Apprentice' },
  { min: 75, name: 'Practitioner' },
  { min: 150, name: 'Specialist' },
  { min: 260, name: 'Expert' },
  { min: 400, name: 'Authority' },
];

export function levelFor(points) {
  let current = LEVELS[0];
  let next = null;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (points >= LEVELS[i].min) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }
  const span = next ? next.min - current.min : 0;
  return {
    ...current,
    next,
    // How far through the current level, for the bar under the level name.
    percent: next ? Math.round(((points - current.min) / span) * 100) : 100,
    toNext: next ? next.min - points : 0,
  };
}
