/* Badges, points and levels (L5) — the server's copy of the scheme.

   THIS MUST STAY IN STEP WITH THE CLIENT:
     fe/src/lms/constants/badgeTiers.js   (TIERS, LEVELS, levelFor)
     fe/src/lms/hooks/useBadges.js        (CATALOGUE)

   Two copies is not the shape anybody would choose, and it is worth being
   explicit about why there are two rather than pretending it is fine.

   The client evaluates the catalogue against the signed-in learner's own record
   — every measure it needs is already loaded for other screens, so a learner's
   own badge page costs no extra request and updates the moment they finish a
   lesson. That is the right design for one person's page and there is no reason
   to change it.

   A leaderboard is the one thing that cannot work that way: it needs everyone
   else's record, and a client cannot be given other learners' progress to add
   up. So the ranking is computed here, from the same catalogue, and the client
   is sent only a name, a level and a total.

   The risk is drift — a badge added on one side and not the other, and a
   learner whose standings row disagrees with their own points. The mitigation
   is that `points` on every leaderboard row comes from HERE for every learner
   including the signed-in one, so a drift shows up as one number rather than as
   a ranking that is quietly wrong. If you change the catalogue, change both. */

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
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (points >= LEVELS[i].min) current = LEVELS[i];
  }
  return current;
}

/* Every badge is EARNED BY EVALUATION, not by a stored flag: each names a
   measure and a target, and the activity already tracked decides whether it is
   met. Same list, same ids, same targets as the client's CATALOGUE — only the
   presentation fields (icon, description) are left out, because nothing here
   renders a badge. */
export const CATALOGUE = [
  // Progress
  { id: 'first-steps', tier: 'bronze', target: 1, measure: (s) => s.lessonsDone },
  { id: 'getting-going', tier: 'bronze', target: 10, measure: (s) => s.lessonsDone },
  { id: 'half-century', tier: 'silver', target: 50, measure: (s) => s.lessonsDone },
  { id: 'centurion', tier: 'gold', target: 100, measure: (s) => s.lessonsDone },

  // Courses and programs
  { id: 'finisher', tier: 'silver', target: 1, measure: (s) => s.coursesComplete },
  { id: 'triple-threat', tier: 'gold', target: 3, measure: (s) => s.coursesComplete },
  { id: 'certified', tier: 'silver', target: 1, measure: (s) => s.certificates },
  { id: 'pathfinder', tier: 'gold', target: 1, measure: (s) => s.pathsComplete },

  // Assessment
  { id: 'first-pass', tier: 'bronze', target: 1, measure: (s) => s.quizzesPassed },
  { id: 'perfect-score', tier: 'silver', target: 1, measure: (s) => s.perfectScores },
  { id: 'examiner', tier: 'gold', target: 5, measure: (s) => s.quizzesPassed },

  // Study habits
  { id: 'note-taker', tier: 'bronze', target: 5, measure: (s) => s.notes },
  { id: 'curator', tier: 'bronze', target: 10, measure: (s) => s.bookmarks },
  { id: 'consistent', tier: 'silver', target: 5, measure: (s) => s.streak },

  // Community
  { id: 'curious', tier: 'bronze', target: 1, measure: (s) => s.questionsAsked },
  { id: 'helpful', tier: 'silver', target: 3, measure: (s) => s.repliesPosted },
  { id: 'critic', tier: 'bronze', target: 1, measure: (s) => s.reviewsWritten },
];

// Every measure the catalogue reads, at zero. A stats object built from a
// learner with no record at all still has to answer every measure, or a badge
// evaluates against `undefined` and silently never unlocks.
export const EMPTY_STATS = {
  lessonsDone: 0,
  coursesComplete: 0,
  certificates: 0,
  notes: 0,
  bookmarks: 0,
  streak: 0,
  quizzesPassed: 0,
  perfectScores: 0,
  pathsComplete: 0,
  questionsAsked: 0,
  repliesPosted: 0,
  reviewsWritten: 0,
};

// Points and standing for one learner's stats.
export function scoreFor(stats) {
  const s = { ...EMPTY_STATS, ...stats };
  const points = CATALOGUE.reduce(
    (total, badge) => (badge.measure(s) >= badge.target ? total + TIERS[badge.tier].points : total),
    0,
  );
  return { points, level: levelFor(points).name };
}
