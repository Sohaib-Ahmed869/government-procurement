import { badgesApi } from '../../api/lms.js';
import { useApi } from './useApi.js';

/* ---------------------------------------------------------------------------
   Cohort standings (L5), from the API.

   LeaderboardTable shipped with five invented people in it — Priya Raman on 285
   points, Tom Alderton on 240 — and sorted the signed-in learner's real row in
   among them. It looked like a leaderboard and it ranked one person against
   fiction: a learner who did the work could not move up, and one who had done
   nothing was told they were sixth of six.

   This is the one part of the badge scheme that has to come from the server.
   Everything else on the badges page is evaluated in the browser from records
   already loaded (see useBadges) — a ranking needs everyone else's record, and
   a client cannot be handed that.

   `points` and `level` on EVERY row, including the learner's own, come from the
   server. The alternative — the server's numbers for the peers and useBadges'
   number for you — would put a row in the table that disagreed with the level
   banner directly above it whenever the two catalogues drifted apart.
   ------------------------------------------------------------------------ */

export function useLeaderboard() {
  const { data, status, error, reload } = useApi(() => badgesApi.leaderboard(), []);

  return {
    // The ranked slice the table draws: the top few, plus the learner's own
    // neighbours. Never the whole cohort — see the controller.
    rows: data?.rows ?? [],
    // The learner's own row, which may be outside the slice above.
    you: data?.you ?? null,
    // How many learners are actually being ranked, for "3rd of 24".
    cohort: data?.cohort ?? 0,
    status,
    error,
    reload,
  };
}
