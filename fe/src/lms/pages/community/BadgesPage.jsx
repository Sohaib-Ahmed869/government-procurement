import LmsIcon from '../../components/LmsIcon.jsx';
import BadgeGrid from '../../components/community/BadgeGrid.jsx';
import LeaderboardTable from '../../components/community/LeaderboardTable.jsx';
import { useBadges } from '../../hooks/useBadges.js';
import { useLeaderboard } from '../../hooks/useLeaderboard.js';

// Badges and gamification (L5).
export default function BadgesPage() {
  const { badges, earned, locked, points, level } = useBadges();
  // Ranked server-side, because a leaderboard needs everybody else's record.
  const standings = useLeaderboard();

  // The closest unearned badge, surfaced at the top. "what's next" is the part
  // that actually changes behaviour.
  const next = locked[0];

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Badges</h1>
          <p className="lms-page__subtitle">
            {earned.length} of {badges.length} earned, {points} points.
          </p>
        </div>
      </div>

      {/* Level banner */}
      <section className="lms-level">
        <div className="lms-level__main">
          <span className="lms-level__medal">
            <LmsIcon name="badge" />
          </span>
          <div>
            <p className="lms-level__eyebrow">Your level</p>
            <p className="lms-level__name">{level.name}</p>
            <p className="lms-level__meta">
              {level.next
                ? `${level.toNext} points to ${level.next.name}`
                : 'Top level reached'}
            </p>
          </div>
        </div>

        <div className="lms-level__bar">
          <span className="lms-progress">
            <span className="lms-progress__fill" style={{ width: `${level.percent}%` }} />
          </span>
          <span className="lms-level__scale">
            <span>{level.min} pts</span>
            <span>{level.next ? `${level.next.min} pts` : `${points} pts`}</span>
          </span>
        </div>
      </section>

      {next ? (
        <section className="lms-card lms-nextbadge">
          <span className={`lms-badge__medal is-${next.tier}`}>
            <LmsIcon name={next.icon} />
          </span>
          <div className="lms-nextbadge__body">
            <p className="lms-nextbadge__label">Closest badge</p>
            <p className="lms-nextbadge__name">{next.name}</p>
            <p className="lms-nextbadge__desc">{next.description}</p>
          </div>
          <div className="lms-nextbadge__progress">
            <span className="lms-progress">
              <span className="lms-progress__fill" style={{ width: `${next.percent}%` }} />
            </span>
            <span className="lms-nextbadge__count">
              {next.value} of {next.target}
            </span>
          </div>
        </section>
      ) : null}

      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="award" />
            Earned
          </h2>
          <span className="lms-card__note">{earned.length} badges</span>
        </div>
        <BadgeGrid
          badges={earned}
          emptyText="Nothing yet. Complete a lesson to earn your first badge."
        />
      </section>

      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="lock" />
            Still to earn
          </h2>
          <span className="lms-card__note">Closest first</span>
        </div>
        <BadgeGrid badges={locked} emptyText="You’ve earned every badge. Genuinely well done." />
      </section>

      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="users" />
            Standings
          </h2>
          {/* Now says how many, once the count is known — "among learners on
              your courses" is a scope, and a reader ranked 4th wants to know
              whether that is 4 of 5 or 4 of 200. */}
          <span className="lms-card__note">
            {standings.cohort > 1
              ? `Among ${standings.cohort} learners on your courses`
              : 'Among learners on your courses'}
          </span>
        </div>
        <div className="lms-board__wrap">
          <LeaderboardTable
            rows={standings.rows}
            you={standings.you}
            cohort={standings.cohort}
            status={standings.status}
          />
        </div>
      </section>
    </div>
  );
}
