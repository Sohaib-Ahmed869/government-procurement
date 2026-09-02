import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ActivityChart from '../../components/progress/ActivityChart.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import DonutChart from '../../components/progress/DonutChart.jsx';
import CompletionSummary from '../../components/progress/CompletionSummary.jsx';
import { useProgress } from '../../hooks/useProgress.js';
import { useActivity } from '../../hooks/useActivity.js';

function duration(minutes) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function when(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/* One scored row in the standing panel: what it measures, how far through it
   is, and the count behind the figure.

   A row only gets a bar when there is a real whole to be a part of. Time
   learned, certificates, notes and bookmarks have none — there is no study
   target in the model and no ceiling on the other three — so those state their
   figure and draw nothing, the same rule the dashboard's gauges follow.

   NO `complete` FLAG on the bar, deliberately. It swaps the green→mint gradient
   for flat mint, which is right for a finished COURSE — done is a state to
   notice — and wrong for a score: "2 of 2 assessments passed" rendered a
   different colour from "1 of 3 courses finished" beside it, so two readings of
   the same kind disagreed with each other. Every scored row now carries the
   same gradient the headline bar above them does. */
function ScoreRow({ label, value, percent, caption, to }) {
  const body = (
    <>
      <span className="lms-score__row-head">
        <span className="lms-score__row-label">{label}</span>
        <span className="lms-score__row-value">{value}</span>
      </span>
      {percent === null || percent === undefined ? (
        <span className="lms-score__row-flat" />
      ) : (
        <ProgressBar percent={percent} />
      )}
      <span className="lms-score__row-caption">{caption}</span>
    </>
  );
  return to ? (
    <Link to={to} className="lms-score__row">{body}</Link>
  ) : (
    <div className="lms-score__row is-static">{body}</div>
  );
}

// My Progress (L3): completion tracking across everything the learner is
// enrolled in, plus assessment results and how much they've been studying.
export default function ProgressPage() {
  const { courses, quizzes, totals, status, error } = useProgress();
  const [range, setRange] = useState('week');
  // Both windows come from the same endpoint; the toggle changes how many days
  // it asks for rather than switching between two shapes of data.
  const { activity } = useActivity(range === 'week' ? 7 : 90);

  // Everything below is one picture of where the learner stands, so it waits
  // for the whole of it rather than painting a page of zeros and then
  // rearranging itself once the real numbers land.
  if (status === 'loading') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">My Progress</h1>
          </div>
        </div>
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '42%', height: 22 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">My Progress</h1>
          </div>
        </div>
        <div className="lms-card">
          <p className="lms-empty">{error}</p>
        </div>
      </div>
    );
  }

  /* Where the minutes went, by course. Nothing new is fetched: every enrolment
     already carries the minutes the server counted against it, and this is the
     only place on the page that says how the time DIVIDED rather than how much
     of it there was. Past five slices the ring is thinner than its own stroke,
     so the tail is summed into one honest "other courses" row. */
  const MAX_SLICES = 5;
  const byTime = courses
    .filter((c) => c.minutes > 0)
    .map((c) => ({ id: c.slug, label: c.title, value: c.minutes }))
    .sort((a, b) => b.value - a.value);
  const mix =
    byTime.length <= MAX_SLICES
      ? byTime
      : [
          ...byTime.slice(0, MAX_SLICES - 1),
          {
            id: 'other',
            label: `${byTime.length - MAX_SLICES + 1} other courses`,
            value: byTime.slice(MAX_SLICES - 1).reduce((n, c) => n + c.value, 0),
          },
        ];

  const scored = [
    {
      key: 'courses',
      label: 'Courses finished',
      value: `${totals.coursesComplete}/${totals.coursesEnrolled}`,
      percent: totals.coursesEnrolled
        ? (totals.coursesComplete / totals.coursesEnrolled) * 100
        : null,
      caption: totals.coursesEnrolled
        ? `${totals.coursesEnrolled - totals.coursesComplete} still under way`
        : 'Nothing enrolled yet',
      to: '/learn/my-courses',
    },
    {
      key: 'quizzes',
      label: 'Assessments passed',
      value: totals.quizzesTaken ? `${totals.quizzesPassed}/${totals.quizzesTaken}` : '—',
      percent: totals.quizzesTaken
        ? (totals.quizzesPassed / totals.quizzesTaken) * 100
        : null,
      caption: totals.quizzesTaken ? 'Best attempt on each quiz' : 'No quizzes taken yet',
    },
    {
      key: 'time',
      label: 'Time learned',
      value: duration(totals.minutes),
      // No study target exists to be a part of, so no bar.
      percent: null,
      caption: 'Across every course',
    },
    {
      key: 'certs',
      label: 'Certificates',
      value: totals.certificates,
      percent: null,
      caption: totals.certificates ? 'Earned so far' : 'Finish a course to earn one',
      to: '/learn/certificates',
    },
    /* Notes and bookmarks were their own two-count card. It was the shortest
       thing on the page by a long way, so whichever row it landed in stretched
       it to twice its content — and they are the same kind of reading as the
       four above: a count of what the learner has accumulated. Six rows, one
       panel, and the grid rows line up. */
    {
      key: 'notes',
      label: 'Notes taken',
      value: totals.notes,
      percent: null,
      caption: 'Across your courses',
      to: '/learn/notes',
    },
    {
      key: 'bookmarks',
      label: 'Bookmarks',
      value: totals.bookmarks,
      percent: null,
      caption: 'Saved lessons and moments',
      to: '/learn/bookmarks',
    },
  ];

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">My Progress</h1>
          <p className="lms-page__subtitle">
            Where you are across every course you’re enrolled in.
          </p>
        </div>
      </div>

      {/* TWO HALVES, and the split is editorial rather than arbitrary.

          Left is where the learner STANDS — the figures, then the courses
          behind them. Right is the SHAPE of it: minutes over time, and how
          those minutes divided. Assessment results run the full width
          underneath, because a result row carries four things across (title,
          bar, score, verdict) and is the one band that wants the whole page.

          Placed by named area rather than stacked in two columns: stacks let
          each column end where it likes, so the card boundaries down the middle
          of the page never lined up with each other. */}
      <div className="lms-prog-grid">
        {/* WHERE YOU STAND.

            This was a 148px ring beside four icon tiles: a percentage stated
            twice — once as an arc, once as a caption under it — and four boxes
            whose icons said nothing the labels did not. It is one panel now: the
            overall figure across the top over a bar of twenty segments, and the
            four readings under it as scored rows.

            The segments are the point. A course at 62% and a course at 58% are
            the same solid strip at a glance; twelve segments lit against eleven
            is a difference you can count. */}
        <section className="lms-card lms-score lms-prog-stand">
          <div className="lms-score__head">
            <div>
              <p className="lms-score__eyebrow">Overall completion</p>
              <p className="lms-score__figure">
                {totals.percent}<span>%</span>
              </p>
            </div>
            {totals.streak > 0 ? (
              <span className="lms-score__streak">
                <LmsIcon name="check" />
                {totals.streak}-day streak
              </span>
            ) : null}
          </div>

          {/* One continuous line, the same bar the dashboard's resume panel
              uses. It was twenty segments — at the width of a whole card that
              read as a row of boxes rather than as a measure, and the count it
              made available (twelve lit of twenty) is the figure printed above
              it in 38px anyway. The segments stayed where a segment is a real
              countable unit: one per lesson, on the module bars. */}
          <div className="lms-score__bar">
            <ProgressBar percent={totals.percent} complete={totals.percent >= 100} />
          </div>

          <p className="lms-score__caption">
            {totals.lessonsDone} of {totals.lessonsTotal} lessons across{' '}
            {totals.coursesEnrolled} {totals.coursesEnrolled === 1 ? 'course' : 'courses'}
          </p>

          <div className="lms-score__grid">
            {scored.map((r) => (
              <ScoreRow key={r.key} {...r} />
            ))}
          </div>
        </section>
        {/* Per-course completion */}
        <section className="lms-card lms-prog-courses">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="book" />
              Course completion
            </h2>
            <span className="lms-card__note">Open a course for its module breakdown</span>
          </div>
          <CompletionSummary courses={courses} />
        </section>
        {/* Assessments. One row per quiz, showing the best result the server
            awarded rather than the most recent one: a learner's standing is what
            they can do, not what they last did. */}
        <section className="lms-card lms-prog-quizzes">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="quiz" />
              Assessment results
            </h2>
            {totals.quizzesTaken ? (
              <span className="lms-card__note">
                {totals.quizzesPassed} of {totals.quizzesTaken} passed
              </span>
            ) : null}
          </div>

          {quizzes.length === 0 ? (
            <p className="lms-empty">
              You haven’t taken a quiz yet. Results show your best score for each one.
            </p>
          ) : (
            <ul className="lms-results">
              {quizzes.map((q) => (
                <li key={q.key} className="lms-result-row">
                  <span className="lms-list__icon"><LmsIcon name="quiz" /></span>
                  <span className="lms-result-row__body">
                    <Link
                      className="lms-result-row__title"
                      to={`/learn/courses/${q.slug}/quiz/${q.quizId}`}
                    >
                      {q.title}
                    </Link>
                    <span className="lms-result-row__meta">
                      {q.courseTitle} · {q.attempts} attempt{q.attempts === 1 ? '' : 's'} · last{' '}
                      {when(q.submittedAt)}
                    </span>
                  </span>
                  {/* The score as a mark, not only as a fraction: a column of
                      quizzes reads down far better when the results line up as
                      bars. A failed attempt takes the amber its pill uses, so the
                      two can never disagree. */}
                  <span className={`lms-result-row__bar${q.passed ? '' : ' is-warn'}`}>
                    <ProgressBar percent={q.percent} />
                  </span>
                  <span className="lms-result-row__score">
                    {q.score}/{q.total}
                    <span>{q.percent}%</span>
                  </span>
                  <span className={`lms-pill ${q.passed ? 'lms-pill--done' : 'lms-pill--due'}`}>
                    {q.passed ? 'Passed' : 'Not passed'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Activity, from GET /lms/activity. Progress holds total minutes and a
            last-accessed date but no history, so this chart had nothing to read
            and ran on a hardcoded fortnight — the same fortnight for everyone,
            including an account that had finished nothing. A day is written on
            each first lesson completion and each quiz submission now, against the
            LEARNER's calendar day rather than the server's. */}
        <section className="lms-card lms-prog-activity">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="chart" />
              Learning activity
            </h2>
            <div className="lms-segmented lms-segmented--sm">
              <button
                type="button"
                className={`lms-segmented__btn${range === 'week' ? ' is-active' : ''}`}
                onClick={() => setRange('week')}
              >
                This week
              </button>
              <button
                type="button"
                className={`lms-segmented__btn${range === 'quarter' ? ' is-active' : ''}`}
                onClick={() => setRange('quarter')}
              >
                12 weeks
              </button>
            </div>
          </div>
          <ActivityChart
            data={activity}
            caption={range === 'week' ? 'Minutes learned per day' : 'Minutes learned per week'}
            step={range === 'week' ? 30 : 60}
          />
          {totals.streak > 0 ? (
            <p className="lms-streak">
              <LmsIcon name="check" />
              {totals.streak}-day streak. Keep it going.
            </p>
          ) : null}
        </section>
        {/* Where the minutes went. The page says how much time and how far
            through; this is the only thing on it that says how the time
            DIVIDED, which is the question "am I spreading myself thin?" */}
        <section className="lms-card lms-card--centre lms-prog-mix">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="chart" />
              Where your time goes
            </h2>
          </div>
          {mix.length === 0 ? (
            <p className="lms-empty">
              Finish a lesson and this will show which courses your time is going into.
            </p>
          ) : (
            <DonutChart
              data={mix}
              total={duration(totals.minutes)}
              totalLabel="learned"
              caption="Time learned, by course"
            />
          )}
        </section>
      </div>
    </div>
  );
}
