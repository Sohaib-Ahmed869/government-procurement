import LmsIcon from '../LmsIcon.jsx';

/* Cohort standings (L5).

   The peers below are PLACEHOLDER. A leaderboard is the one part of
   gamification that cannot be derived from the signed-in learner's own record,
   because it needs everyone else's. Only the "you" row is real.

   Worth a product decision before this ships: a public leaderboard in a
   professional setting can discourage the people furthest behind, who are the
   ones the LMS most needs to keep. Common mitigations are showing only the
   learner's own neighbours in the ranking, or scoping it to an organisation's
   own seats (C3) rather than every customer. It is opt-in here by being its own
   section rather than the top of the page.

   TODO: `badgesApi` should return a ranked slice around the learner, not the
   whole table. Sending every user's points to the client is both a
   privacy question and an unbounded payload. */
const PEERS = [
  { id: 'p1', name: 'Priya Raman', points: 285, level: 'Expert' },
  { id: 'p2', name: 'Tom Alderton', points: 240, level: 'Specialist' },
  { id: 'p3', name: 'Dana Whitfield', points: 175, level: 'Specialist' },
  { id: 'p5', name: 'James Okoro', points: 95, level: 'Practitioner' },
  { id: 'p6', name: 'Mei Chen', points: 60, level: 'Apprentice' },
];

function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function LeaderboardTable({ you, points, level }) {
  const rows = [...PEERS, { id: 'you', name: you, points, level, isYou: true }].sort(
    (a, b) => b.points - a.points,
  );

  return (
    <table className="lms-board">
      <caption className="lms-sr-only">Cohort standings by points</caption>
      <thead>
        <tr>
          <th scope="col" className="lms-board__rank">#</th>
          <th scope="col">Learner</th>
          <th scope="col">Level</th>
          <th scope="col" className="lms-board__pts">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id} className={r.isYou ? 'is-you' : undefined}>
            <td className="lms-board__rank">
              {i < 3 ? (
                <LmsIcon name="award" className={`lms-board__medal is-${['gold', 'silver', 'bronze'][i]}`} />
              ) : (
                i + 1
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
        ))}
      </tbody>
    </table>
  );
}
