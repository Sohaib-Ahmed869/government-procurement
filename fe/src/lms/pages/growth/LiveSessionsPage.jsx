import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import {
  useLiveSessions,
  useJoinSession,
  formatSessionTime,
  relativeTo,
} from '../../hooks/useLiveSessions.js';

/* Live teaching sessions, the learner's view (LMS 17.0b).

   Everything about whether the room is open comes from the server: `joinable`
   is computed there from the same arithmetic the join endpoint enforces, so the
   button being enabled and the click succeeding cannot disagree. */

const STATE_LABEL = {
  upcoming: 'Scheduled',
  live: 'Live now',
  ended: 'Finished',
  cancelled: 'Cancelled',
};

function SessionCard({ session, onJoin, joining, error }) {
  const { state, joinable, hasMeeting, hostStarted } = session;

  // Why the button is off, in the words the learner needs. An inert button with
  // no explanation is the thing this whole block exists to avoid.
  const blockedReason = (() => {
    if (state === 'cancelled') return session.cancelReason || 'This session was cancelled.';
    if (state === 'ended') return 'This session has finished.';
    if (!hasMeeting) return 'No meeting link yet — your instructor has been told.';
    if (!joinable) return `Opens ${formatSessionTime(session.joinOpensAt, session.timezone)}`;
    // Explain an early open, or it looks like the countdown is wrong.
    if (hostStarted) return 'Your instructor has started this session.';
    return '';
  })();

  return (
    <article className={`lms-live-card lms-live-card--${state}`}>
      <div className="lms-live-card__when">
        <span className={`lms-live-badge lms-live-badge--${state}`}>
          {state === 'live' ? <span className="lms-live-dot" aria-hidden="true" /> : null}
          {state === 'live' && hostStarted ? 'Started' : STATE_LABEL[state]}
        </span>
        <time dateTime={session.startsAt} className="lms-live-card__time">
          {formatSessionTime(session.startsAt, session.timezone)}
        </time>
        {state === 'upcoming' ? (
          <span className="lms-live-card__rel">{relativeTo(session.startsAt)}</span>
        ) : null}
      </div>

      <div className="lms-live-card__body">
        <h3 className="lms-live-card__title">{session.title}</h3>
        {session.course ? (
          <Link className="lms-live-card__course" to={`/learn/courses/${session.course.slug}`}>
            {session.course.title}
          </Link>
        ) : null}
        {session.description ? (
          <p className="lms-live-card__desc">{session.description}</p>
        ) : null}
        <p className="lms-live-card__meta">
          <LmsIcon name="clock" />
          {session.durationMinutes} minutes
          {session.host ? <> · with {session.host.name}</> : null}
        </p>
      </div>

      <div className="lms-live-card__action">
        <button
          type="button"
          className="lms-btn lms-btn--primary"
          disabled={!joinable || !hasMeeting || joining}
          onClick={() => onJoin(session._id)}
        >
          {joining ? 'Opening…' : 'Join session'}
        </button>
        {blockedReason ? <p className="lms-live-card__note">{blockedReason}</p> : null}
        {error ? <p className="lms-live-card__error">{error}</p> : null}
      </div>
    </article>
  );
}

export default function LiveSessionsPage() {
  const { upcoming, past, status, error, reload } = useLiveSessions();
  const joinSession = useJoinSession();
  const [busyId, setBusyId] = useState('');
  const [joinError, setJoinError] = useState({});

  async function handleJoin(id) {
    setBusyId(id);
    setJoinError((e) => ({ ...e, [id]: '' }));
    try {
      await joinSession(id);
    } catch (err) {
      // The server's message is the useful one — it says whether the enrolment
      // failed, the room is not open yet, or there is no link.
      setJoinError((e) => ({ ...e, [id]: err?.message ?? 'Could not open the session.' }));
      // An enrolment that lapsed mid-page makes every other row stale too.
      reload();
    } finally {
      setBusyId('');
    }
  }

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Live sessions</h1>
          <p className="lms-page__subtitle">
            {upcoming.length
              ? `${upcoming.length} session${upcoming.length === 1 ? '' : 's'} coming up on your courses.`
              : 'Live classes on the courses you are enrolled in appear here.'}
          </p>
        </div>
      </div>

      {status === 'loading' ? <p className="lms-empty">Loading sessions…</p> : null}
      {status === 'error' ? <p className="lms-empty">{error}</p> : null}

      {status === 'ready' && !upcoming.length && !past.length ? (
        <div className="lms-card">
          <p className="lms-empty">
            Nothing scheduled yet. When an instructor sets up a live class on a course you are
            enrolled in, it will show here with a join button.
          </p>
        </div>
      ) : null}

      {upcoming.length ? (
        <section className="lms-live-list">
          {upcoming.map((s) => (
            <SessionCard
              key={s._id}
              session={s}
              onJoin={handleJoin}
              joining={busyId === s._id}
              error={joinError[s._id]}
            />
          ))}
        </section>
      ) : null}

      {past.length ? (
        <section className="lms-live-list lms-live-list--past">
          <h2 className="lms-section-title">Earlier</h2>
          {past.map((s) => (
            <SessionCard key={s._id} session={s} onJoin={handleJoin} joining={false} error="" />
          ))}
        </section>
      ) : null}
    </div>
  );
}
