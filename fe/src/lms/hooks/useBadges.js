import { useMemo } from 'react';
import { TIERS, levelFor } from '../constants/badgeTiers.js';
import { useProgress } from './useProgress.js';
import { useDiscussions } from './useDiscussions.js';
import { useReviews } from './useReviews.js';
import { usePaths } from './usePaths.js';

/* ---------------------------------------------------------------------------
   Badges and gamification (L5).

   Every badge is EARNED BY EVALUATION, not by a stored flag. Each one names a
   measure and a target, and the same activity the rest of the LMS already
   tracks decides whether it is met. Two things follow from that:

     - a locked badge can show real progress toward itself, because the measure
       is a live number rather than a boolean waiting to be flipped;
     - the scheme can't drift out of step with the learner's actual record.

   TODO: `badgesApi.mine()` will award these server-side (a client that can mint
   its own badges is decoration, not achievement). The catalogue below is the
   spec that endpoint should implement.
   ------------------------------------------------------------------------ */

const CATALOGUE = [
  // Progress
  { id: 'first-steps', name: 'First Steps', icon: 'play', tier: 'bronze', target: 1,
    description: 'Complete your first lesson', measure: (s) => s.lessonsDone },
  { id: 'getting-going', name: 'Getting Going', icon: 'lessons', tier: 'bronze', target: 10,
    description: 'Complete 10 lessons', measure: (s) => s.lessonsDone },
  { id: 'half-century', name: 'Half Century', icon: 'chart', tier: 'silver', target: 50,
    description: 'Complete 50 lessons', measure: (s) => s.lessonsDone },
  { id: 'centurion', name: 'Centurion', icon: 'chart', tier: 'gold', target: 100,
    description: 'Complete 100 lessons', measure: (s) => s.lessonsDone },

  // Courses and programs
  { id: 'finisher', name: 'Finisher', icon: 'book', tier: 'silver', target: 1,
    description: 'Complete a whole course', measure: (s) => s.coursesComplete },
  { id: 'triple-threat', name: 'Triple Threat', icon: 'book', tier: 'gold', target: 3,
    description: 'Complete three courses', measure: (s) => s.coursesComplete },
  { id: 'certified', name: 'Certified', icon: 'award', tier: 'silver', target: 1,
    description: 'Earn your first certificate', measure: (s) => s.certificates },
  { id: 'pathfinder', name: 'Pathfinder', icon: 'path', tier: 'gold', target: 1,
    description: 'Complete a full learning path', measure: (s) => s.pathsComplete },

  // Assessment
  { id: 'first-pass', name: 'Assessed', icon: 'quiz', tier: 'bronze', target: 1,
    description: 'Pass your first quiz', measure: (s) => s.quizzesPassed },
  { id: 'perfect-score', name: 'Perfect Score', icon: 'check', tier: 'silver', target: 1,
    description: 'Score 100% on a quiz', measure: (s) => s.perfectScores },
  { id: 'examiner', name: 'Examiner', icon: 'quiz', tier: 'gold', target: 5,
    description: 'Pass five quizzes', measure: (s) => s.quizzesPassed },

  // Study habits
  { id: 'note-taker', name: 'Note Taker', icon: 'note', tier: 'bronze', target: 5,
    description: 'Take five notes', measure: (s) => s.notes },
  { id: 'curator', name: 'Curator', icon: 'bookmark', tier: 'bronze', target: 10,
    description: 'Save ten bookmarks', measure: (s) => s.bookmarks },
  { id: 'consistent', name: 'Consistent', icon: 'clock', tier: 'silver', target: 5,
    description: 'Learn five days in a row', measure: (s) => s.streak },

  // Community
  { id: 'curious', name: 'Curious', icon: 'chat', tier: 'bronze', target: 1,
    description: 'Ask a question in the discussions', measure: (s) => s.questionsAsked },
  { id: 'helpful', name: 'Helpful', icon: 'users', tier: 'silver', target: 3,
    description: 'Post three replies to other learners', measure: (s) => s.repliesPosted },
  { id: 'critic', name: 'Critic', icon: 'star', tier: 'bronze', target: 1,
    description: 'Review a course you’ve taken', measure: (s) => s.reviewsWritten },
];

// Everything the catalogue can measure, gathered from the stores that already
// hold it.
function useGamificationStats() {
  const { quizzes, totals } = useProgress();
  const { threads } = useDiscussions();
  const { reviews } = useReviews();
  const { paths } = usePaths();

  return useMemo(
    () => ({
      lessonsDone: totals.lessonsDone,
      coursesComplete: totals.coursesComplete,
      certificates: totals.certificates,
      notes: totals.notes,
      bookmarks: totals.bookmarks,
      streak: totals.streak,
      quizzesPassed: totals.quizzesPassed,
      perfectScores: quizzes.filter((q) => q.percent === 100).length,
      pathsComplete: paths.filter((p) => p.complete).length,
      questionsAsked: threads.filter((t) => t.mine).length,
      repliesPosted: threads.reduce(
        (n, t) => n + t.replies.filter((r) => r.mine).length,
        0,
      ),
      reviewsWritten: reviews.length,
    }),
    [totals, quizzes, paths, threads, reviews],
  );
}

export function useBadges() {
  const stats = useGamificationStats();

  return useMemo(() => {
    const badges = CATALOGUE.map((badge) => {
      const value = badge.measure(stats);
      const earned = value >= badge.target;
      return {
        ...badge,
        tierMeta: TIERS[badge.tier],
        points: TIERS[badge.tier].points,
        value: Math.min(value, badge.target),
        earned,
        percent: Math.min(100, Math.round((value / badge.target) * 100)),
      };
    });

    const earned = badges.filter((b) => b.earned);
    const points = earned.reduce((s, b) => s + b.points, 0);

    // Locked badges sort by how close they are, so the next realistic one is
    // at the front rather than buried behind a hundred-lesson milestone.
    const locked = badges
      .filter((b) => !b.earned)
      .sort((a, b) => b.percent - a.percent);

    return {
      badges,
      earned,
      locked,
      points,
      level: levelFor(points),
      stats,
    };
  }, [stats]);
}
