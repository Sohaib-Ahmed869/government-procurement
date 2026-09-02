import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { useInstructorQuizzes, useQuizSummary } from '../../hooks/useInstructorQuizzes.js';

const TYPE_LABEL = { single: 'Single', multi: 'Multiple', boolean: 'True/false', text: 'Short answer' };

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'blocking', label: 'Needs fixing' },
  { value: 'empty', label: 'Empty' },
];

// Quizzes (L3/R1). Every assessment across the instructor's courses, checked
// for the problems a learner would otherwise find first.
export default function QuizzesPage() {
  const { quizzes, status } = useInstructorQuizzes();
  const summary = useQuizSummary();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quizzes
      .filter((row) => {
        if (tab === 'blocking' && !row.blocking.length) return false;
        if (tab === 'empty' && row.questionCount > 0) return false;
        if (!q) return true;
        return (
          row.title.toLowerCase().includes(q) ||
          row.courseTitle.toLowerCase().includes(q) ||
          row.moduleTitle.toLowerCase().includes(q)
        );
      })
      // Broken ones first. This page exists to surface them.
      .sort((a, b) => b.blocking.length - a.blocking.length);
  }, [quizzes, tab, query]);

  const counts = {
    all: quizzes.length,
    blocking: summary.blocking,
    empty: summary.empty,
  };

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Quizzes</h1>
          <p className="lms-page__subtitle">
            {quizzes.length
              ? `${summary.total} quizzes · ${summary.questions} questions · ${summary.ready} ready to go.`
              : 'Assessments across your courses.'}
          </p>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="lms-card"><p className="lms-empty">Loading your quizzes…</p></div>
      ) : quizzes.length === 0 ? (
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="quiz" className="lms-blank__icon" />
            <h2>No quizzes yet</h2>
            <p>
              Add a quiz lesson to any course and it’ll appear here, along with a check on
              whether it’s ready for learners.
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses">
              Go to my courses
            </Link>
          </div>
        </div>
      ) : (
        <>
          {summary.blocking > 0 ? (
            <section className="lms-card lms-notice lms-notice--danger" style={{ marginBottom: 18 }}>
              <span className="lms-notice__icon"><LmsIcon name="lock" /></span>
              <div className="lms-notice__body">
                <p className="lms-notice__title">
                  {summary.blocking} quiz{summary.blocking === 1 ? '' : 'zes'} can’t be marked properly
                </p>
                <p className="lms-notice__text">
                  A question with no correct answer marked scores every learner zero on it,
                  whatever they choose. Worth fixing before anyone sits these.
                </p>
              </div>
              <button type="button" className="lms-btn lms-btn--sm" onClick={() => setTab('blocking')}>
                Show them
              </button>
            </section>
          ) : null}

          <div className="lms-filters">
            <div className="lms-segmented">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`lms-segmented__btn${tab === t.value ? ' is-active' : ''}`}
                  onClick={() => setTab(t.value)}
                >
                  {t.label}
                  <span className="lms-segmented__count">{counts[t.value]}</span>
                </button>
              ))}
            </div>
            <div className="lms-filters__right">
              <div className="lms-search lms-search--inline">
                <LmsIcon name="search" />
                <input
                  type="search"
                  value={query}
                  placeholder="Search quizzes…"
                  aria-label="Search quizzes"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="lms-card">
              <p className="lms-empty">
                {tab === 'blocking'
                  ? 'Nothing broken. Every quiz can be marked.'
                  : tab === 'empty'
                    ? 'No empty quizzes.'
                    : `No quizzes match “${query.trim()}”.`}
              </p>
            </div>
          ) : (
            <div className="lms-quizlist">
              {visible.map((row) => (
                <article
                  className={`lms-quizrow${row.blocking.length ? ' is-broken' : ''}`}
                  key={row.id}
                >
                  <div className="lms-quizrow__head">
                    <div className="lms-quizrow__id">
                      <span className="lms-quizrow__icon">
                        <LmsIcon name="quiz" />
                      </span>
                      <div>
                        <h2 className="lms-quizrow__title">{row.title}</h2>
                        <p className="lms-quizrow__where">
                          <Link to={`/learn/instructor/courses/${row.courseId}`}>
                            {row.courseTitle}
                          </Link>
                          {' · '}
                          {row.moduleTitle}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`lms-pill ${
                        row.blocking.length
                          ? 'lms-pill--due'
                          : row.issues.length
                            ? ''
                            : 'lms-pill--done'
                      }`}
                    >
                      {row.blocking.length
                        ? 'Needs fixing'
                        : row.issues.length
                          ? `${row.issues.length} to polish`
                          : 'Ready'}
                    </span>
                  </div>

                  <ul className="lms-quizrow__stats">
                    <li>
                      <LmsIcon name="lessons" />
                      <strong>{row.questionCount}</strong> questions
                    </li>
                    <li>
                      <LmsIcon name="check" />
                      <strong>{row.passMark}%</strong> to pass
                    </li>
                    <li>
                      <LmsIcon name="clock" />
                      <strong>{row.timeLimitMins || '-'}</strong>
                      {row.timeLimitMins ? ' min limit' : ' no limit'}
                    </li>
                    {Object.entries(row.types).map(([type, n]) => (
                      <li key={type}>
                        <strong>{n}</strong> {TYPE_LABEL[type] ?? type}
                      </li>
                    ))}
                  </ul>

                  {row.issues.length ? (
                    <ul className="lms-quizrow__issues">
                      {row.issues.slice(0, 4).map((issue) => (
                        <li key={issue} className={row.blocking.includes(issue) ? 'is-blocking' : undefined}>
                          <LmsIcon name={row.blocking.includes(issue) ? 'lock' : 'clock'} />
                          {issue}
                        </li>
                      ))}
                      {row.issues.length > 4 ? (
                        <li className="lms-quizrow__more">
                          and {row.issues.length - 4} more
                        </li>
                      ) : null}
                    </ul>
                  ) : null}

                  <div className="lms-quizrow__foot">
                    <span className="lms-quizrow__note">
                      Edited in the course builder, so questions live in one place only.
                    </span>
                    <span className="lms-quizrow__actions">
                      {/* Per-question analytics for THIS quiz, which have
                          existed at /authoring/analytics/quizzes/:lessonId all
                          along — the page just never linked to them. Offered
                          only where there is something to analyse: a quiz with
                          no questions has no cohort to have failed them. */}
                      {row.questionCount > 0 ? (
                        <Link
                          className="lms-btn lms-btn--sm"
                          to={`/learn/instructor/progress/quizzes/${row.lessonId}`}
                        >
                          <LmsIcon name="chart" />
                          Results
                        </Link>
                      ) : null}
                      <Link
                        className="lms-btn lms-btn--sm lms-btn--primary"
                        to={`/learn/instructor/courses/${row.courseId}`}
                      >
                        <LmsIcon name="note" />
                        Edit quiz
                      </Link>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
