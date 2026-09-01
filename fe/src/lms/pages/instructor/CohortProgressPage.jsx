import { Link, useNavigate } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import { useCohortAnalytics } from '../../hooks/useInstructor.js';

function when(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

// A pass rate that low usually means the quiz is wrong, not the cohort. Kept as
// a hint rather than a verdict: a genuinely hard gate exam can sit here on
// purpose, and the instructor is the one who knows which it is.
const SUSPECT_PASS_RATE = 40;

// Student progress (L3 / R1): how the assessments are performing across
// everyone taking them, and who has stopped.
//
// Deliberately NOT a second completion screen. Enrolments already answers "how
// far through is this person"; this answers "is my assessment doing its job",
// which needs the marked attempts and cannot be worked out from the course.
export default function CohortProgressPage() {
  const navigate = useNavigate();
  const { totals, quizzes, stalled, status, error } = useCohortAnalytics();

  const head = (
    <div className="lms-page__head">
      <div>
        <h1 className="lms-page__title">Student progress</h1>
        <p className="lms-page__subtitle">
          How your assessments are performing, and who has stopped.
        </p>
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div>
        {head}
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '38%', height: 22 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div>
        {head}
        <div className="lms-card"><p className="lms-empty">{error}</p></div>
      </div>
    );
  }

  const taken = quizzes.filter((q) => q.learners > 0);
  const untaken = quizzes.length - taken.length;

  return (
    <div>
      {head}

      <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {[
          {
            icon: 'quiz', label: 'Quizzes taken', value: totals.taken ?? 0,
            hint: untaken ? `${untaken} not attempted yet` : 'All of them',
          },
          { icon: 'users', label: 'Learners assessed', value: totals.learnersAssessed ?? 0, hint: 'People, not attempts' },
          { icon: 'note', label: 'Attempts', value: totals.attempts ?? 0, hint: 'Marked submissions' },
          { icon: 'check', label: 'Pass rate', value: `${totals.passRate ?? 0}%`, hint: 'Averaged across quizzes' },
        ].map((s) => (
          <span key={s.label} className="lms-stat is-static">
            <span className="lms-stat__icon"><LmsIcon name={s.icon} /></span>
            <span>
              <span className="lms-stat__label">{s.label}</span>
              <span className="lms-stat__value">{s.value}</span>
              <span className="lms-stat__hint">{s.hint}</span>
            </span>
          </span>
        ))}
      </div>

      {/* --- Assessment performance ------------------------------------- */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="quiz" />
            Assessment performance
          </h2>
          <span className="lms-card__note">Open a quiz to see how each question did</span>
        </div>

        {quizzes.length === 0 ? (
          <div className="lms-blank">
            <LmsIcon name="quiz" className="lms-blank__icon" />
            <h2>No quizzes yet</h2>
            <p>
              Add a quiz to a course and this fills in as learners sit it: pass rates,
              how many goes it takes, and which questions are tripping people up.
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/instructor/quizzes">
              <LmsIcon name="quiz" />
              Your quizzes
            </Link>
          </div>
        ) : taken.length === 0 ? (
          <p className="lms-empty">
            Nobody has taken any of your {quizzes.length} quizzes yet. Once they do, their
            results show up here.
          </p>
        ) : (
          <div className="lms-dtable__scroll">
            <table className="lms-dtable">
              <thead>
                <tr>
                  <th scope="col">Quiz</th>
                  <th scope="col">Taken by</th>
                  <th scope="col">Pass rate</th>
                  <th scope="col">Average best</th>
                  <th scope="col">Attempts each</th>
                  <th scope="col">Last taken</th>
                  <th scope="col"><span className="lms-sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {taken.map((q) => {
                  const href = `/learn/instructor/progress/quizzes/${q.lesson}`;
                  const suspect = q.passRate < SUSPECT_PASS_RATE;
                  return (
                    <tr key={q.lesson} className="is-clickable" onClick={() => navigate(href)}>
                      <td>
                        <span className="lms-roster__id">
                          <Link
                            className="lms-ecourse__title"
                            to={href}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {q.title}
                          </Link>
                          <span className="lms-roster__sub">
                            {q.course?.title} · {q.questionCount} question
                            {q.questionCount === 1 ? '' : 's'} · pass at {q.passMark}%
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="lms-ecourse__num">{q.learners}</span>
                        <span className="lms-roster__sub">{q.attempts} attempts</span>
                      </td>
                      <td>
                        <span className="lms-ecourse__avg">
                          {/* No `complete`: that flag fills the bar flat mint,
                              which on a course card means "finished". A pass
                              rate is a RATE — 100% of the people who sat it
                              passed, which is not a thing being done — so it
                              keeps the app's dark-green→mint gradient like
                              every other measurement on the page. */}
                          <ProgressBar percent={q.passRate} />
                          <span className="lms-roster__pct">{q.passRate}%</span>
                        </span>
                        {suspect ? (
                          <span className="lms-flag">
                            <LmsIcon name="lock" />
                            Worth a look
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span className="lms-ecourse__num">{q.averageBest}%</span>
                        <span className="lms-roster__sub">{q.averageFirst}% first go</span>
                      </td>
                      <td>
                        <span className="lms-ecourse__num">{q.averageAttempts}</span>
                        <span className="lms-roster__sub">
                          {q.averageAttemptsToPass
                            ? `${q.averageAttemptsToPass} to pass`
                            : 'None passed'}
                        </span>
                      </td>
                      <td><span className="lms-roster__date">{when(q.lastAttemptAt)}</span></td>
                      <td><LmsIcon name="arrow" className="lms-dtable__go" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- Who has stopped --------------------------------------------- */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="clock" />
            Stalled learners
          </h2>
          <span className="lms-card__note">
            Enrolled, not finished, nothing for {stalled.afterDays}+ days
          </span>
        </div>

        {stalled.rows.length === 0 ? (
          <p className="lms-empty">
            Nobody has stalled. Everyone enrolled has either finished or been active in
            the last {stalled.afterDays} days.
          </p>
        ) : (
          <>
            <div className="lms-dtable__scroll">
              <table className="lms-dtable">
                <thead>
                  <tr>
                    <th scope="col">Learner</th>
                    <th scope="col">Course</th>
                    <th scope="col">Got to</th>
                    <th scope="col">Last active</th>
                    <th scope="col">Idle</th>
                  </tr>
                </thead>
                <tbody>
                  {stalled.rows.map((s) => (
                    <tr key={`${s.user._id}-${s.course._id}`}>
                      <td>
                        <span className="lms-roster__who">
                          <span className="lms-avatar" aria-hidden="true">{initials(s.user.name)}</span>
                          <span className="lms-roster__id">
                            <span className="lms-roster__name">{s.user.name}</span>
                            <span className="lms-roster__email">{s.user.email}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <Link
                          className="lms-ecourse__title"
                          to={`/learn/instructor/students/${s.course._id}`}
                        >
                          {s.course.title}
                        </Link>
                      </td>
                      <td>
                        <span className="lms-ecourse__avg">
                          <ProgressBar percent={s.percent} />
                          <span className="lms-roster__pct">
                            {s.lessonsDone}/{s.lessonsTotal}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="lms-roster__date">
                          {s.reason === 'never-started' ? 'Never started' : when(s.lastActiveAt)}
                        </span>
                        <span className="lms-roster__sub">
                          {s.reason === 'never-started'
                            ? `Enrolled ${when(s.enrolledAt)}`
                            : 'Last lesson'}
                        </span>
                      </td>
                      <td>
                        <span className="lms-ecourse__num">{s.idleDays}</span>
                        <span className="lms-roster__sub">days</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Said out loud. A list that silently stops at fifty reads as
                "that's everyone", which is the wrong thing to believe. */}
            {stalled.omitted ? (
              <p className="lms-field__hint">
                Showing the {stalled.rows.length} longest idle. {stalled.omitted} more are
                also stalled.
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
