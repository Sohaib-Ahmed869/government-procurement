import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ActivityChart from '../../components/progress/ActivityChart.jsx';
import ProgressRing from '../../components/progress/ProgressRing.jsx';
import CompletionSummary from '../../components/progress/CompletionSummary.jsx';
import { useProgress } from '../../hooks/useProgress.js';
import { WEEK_ACTIVITY, QUARTER_ACTIVITY } from '../../hooks/placeholderData.js';

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

// My Progress (L3): completion tracking across everything the learner is
// enrolled in, plus assessment results and how much they've been studying.
export default function ProgressPage() {
  const { courses, quizzes, totals, status, error } = useProgress();
  const [range, setRange] = useState('week');

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

  const stats = [
    { key: 'courses', icon: 'book', value: `${totals.coursesComplete}/${totals.coursesEnrolled}`, label: 'Courses complete', to: '/learn/my-courses' },
    { key: 'lessons', icon: 'lessons', value: totals.lessonsDone, label: `of ${totals.lessonsTotal} lessons` },
    { key: 'time', icon: 'clock', value: duration(totals.minutes), label: 'Time learned' },
    { key: 'certs', icon: 'award', value: totals.certificates, label: 'Certificates', to: '/learn/certificates' },
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

      {/* Headline: the one overall figure, with the counts beside it. */}
      <section className="lms-card lms-overview">
        <div className="lms-overview__ring">
          <ProgressRing
            percent={totals.percent}
            label="Overall completion"
            sublabel="complete"
          />
          <p className="lms-overview__caption">
            {totals.lessonsDone} of {totals.lessonsTotal} lessons across{' '}
            {totals.coursesEnrolled} courses
          </p>
        </div>

        <div className="lms-overview__stats">
          {stats.map((s) => {
            const inner = (
              <>
                <span className="lms-stat__icon"><LmsIcon name={s.icon} /></span>
                <span>
                  <span className="lms-stat__value">{s.value}</span>
                  <span className="lms-stat__label">{s.label}</span>
                </span>
              </>
            );
            return s.to ? (
              <Link key={s.key} to={s.to} className="lms-stat lms-stat--tight">{inner}</Link>
            ) : (
              <span key={s.key} className="lms-stat lms-stat--tight is-static">{inner}</span>
            );
          })}
        </div>
      </section>

      {/* Activity. The one part of this page still on placeholder data:
          nothing records per-day activity yet. Progress holds total minutes and
          a last-accessed date, not a history, so a real chart needs that
          history stored before it can be drawn. */}
      <section className="lms-card" style={{ marginTop: 18 }}>
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
          data={range === 'week' ? WEEK_ACTIVITY : QUARTER_ACTIVITY}
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

      {/* Per-course completion */}
      <section className="lms-card" style={{ marginTop: 18 }}>
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
      <section className="lms-card" style={{ marginTop: 18 }}>
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

      {/* What they've collected along the way */}
      <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginTop: 18 }}>
        <Link to="/learn/notes" className="lms-stat">
          <span className="lms-stat__icon"><LmsIcon name="note" /></span>
          <span>
            <span className="lms-stat__label">Notes taken</span>
            <span className="lms-stat__value">{totals.notes}</span>
            <span className="lms-stat__hint">Across your courses</span>
          </span>
        </Link>
        <Link to="/learn/bookmarks" className="lms-stat">
          <span className="lms-stat__icon"><LmsIcon name="bookmark" /></span>
          <span>
            <span className="lms-stat__label">Bookmarks</span>
            <span className="lms-stat__value">{totals.bookmarks}</span>
            <span className="lms-stat__hint">Saved lessons and moments</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
