import LmsIcon from '../LmsIcon.jsx';

/* Cohort standings (L5).

   The rows are real. This component held a PEERS array of five invented
   learners and sorted the signed-in one in among them, which meant the table
   ranked one real person against fiction — nothing they did could move them,
   and a learner with no record was told they came sixth of six.

   Everything now comes from GET /lms/badges/leaderboard, which ranks learners
   who share a course with the signed-in one and returns a slice: the top few
   plus their own neighbours, so somebody in the middle can see the rung above
   them without the page carrying the whole cohort. See useLeaderboard.

   Still worth a product decision before this ships: a public leaderboard in a
   professional setting can discourage the people furthest behind, who are the
   ones the LMS most needs to keep. The scope is already the narrowest that
   makes sense — learners on your own courses, no underlying activity, never the
   full table — and it sits in its own section rather than at the top of the
   page. Dropping it to the learner's own neighbours only, with no top three, is
   the next lever if it reads as discouraging. */

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

// Rank 1-3 get a medal; everyone else gets their number. `rank` comes from the
// server and is the position in the WHOLE cohort, not the index in this slice —
// a learner shown 8th must read 8th whether or not ranks 4-7 are on screen.
const MEDALS = ['gold', 'silver', 'bronze'];

export default function LeaderboardTable({ rows, you, cohort, status }) {
  if (status === 'loading') {
    return <p className="lms-board__note">Loading standings…</p>;
  }
  if (status === 'error') {
    return <p className="lms-board__note">We couldn’t load the standings just now.</p>;
  }
  if (!rows.length) {
    return <p className="lms-board__note">No standings yet.</p>;
  }

  /* A learner alone on their courses is not in a competition, and a table of
     one with a gold medal on it says the opposite of what it means. */
  if (cohort <= 1) {
    return (
      <p className="lms-board__note">
        You’re the only learner on your courses so far, on {you?.points ?? 0} points. Standings
        appear once somebody else enrols alongside you.
      </p>
    );
  }

  // The slice can skip ranks — the top three, then a gap, then the learner's
  // own neighbours. The gap is drawn rather than closed, so nobody reads rank 3
  // sitting directly above rank 9 as four consecutive places.
  const withGaps = rows.flatMap((row, i) => {
    const previous = rows[i - 1];
    return previous && row.rank > previous.rank + 1 ? [{ gapBefore: row.rank }, row] : [row];
  });

  return (
    <table className="lms-board">
      <caption className="lms-sr-only">
        Cohort standings by points — {cohort} learners on your courses
      </caption>
      <thead>
        <tr>
          <th scope="col" className="lms-board__rank">#</th>
          <th scope="col">Learner</th>
          <th scope="col">Level</th>
          <th scope="col" className="lms-board__pts">Points</th>
        </tr>
      </thead>
      <tbody>
        {withGaps.map((r) =>
          r.gapBefore ? (
            <tr className="lms-board__gap" key={`gap-${r.gapBefore}`} aria-hidden="true">
              <td colSpan={4}>⋯</td>
            </tr>
          ) : (
            <tr key={r.id} className={r.isYou ? 'is-you' : undefined}>
              <td className="lms-board__rank">
                {r.rank <= 3 ? (
                  <LmsIcon name="award" className={`lms-board__medal is-${MEDALS[r.rank - 1]}`} />
                ) : (
                  r.rank
                )}
              </td>
              <td>
                <span className="lms-board__who">
                  <span className={`lms-avatar${r.isYou ? ' is-instructor' : ''}`}>
                    {initials(r.name)}
                  </span>
                  {r.name}
                  {r.isYou ? <span className="lms-badge-inst">You</span> : null}
                </span>
              </td>
              <td className="lms-board__level">{r.level}</td>
              <td className="lms-board__pts">{r.points}</td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
