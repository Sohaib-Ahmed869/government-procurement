import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import { useQuizAnalytics } from '../../hooks/useInstructor.js';

// Below this, a question is doing something other than testing knowledge often
// enough to be worth reading again. Not a verdict — a hard question in a hard
// course can sit here legitimately — so it reads as a prompt, not a failure.
const WEAK = 40;
// Above this it isn't discriminating: everyone gets it, so it isn't telling the
// instructor anything about who understood the material.
const TRIVIAL = 95;

const TYPE_LABEL = {
  single: 'Single choice',
  multi: 'Multiple choice',
  boolean: 'True / false',
  text: 'Short answer',
};

function verdict(q) {
  if (q.asked === 0) return null;
  if (q.correctRate === 0) {
    return {
      tone: 'bad',
      text: 'Nobody has ever got this right. That is usually a wrong answer key rather than a hard question — check the ticked option.',
    };
  }
  if (q.correctRate < WEAK) {
    return {
      tone: 'warn',
      text: 'Most people get this wrong. Worth re-reading the wording, and checking the lesson actually covers it.',
    };
  }
  if (q.correctRate >= TRIVIAL) {
    return {
      tone: 'note',
      text: 'Nearly everyone gets this. It isn’t separating those who understood the material from those who didn’t.',
    };
  }
  return null;
}

// Item analysis for one quiz (L3 / R1).
//
// The question an instructor cannot answer from the course itself: which of my
// questions is broken. A prompt that everyone fails looks identical to a cohort
// that didn't do the reading until you can see the marked attempts, and the
// answer-distribution below is what tells the two apart — answers piled on one
// wrong option is a misleading distractor or a mis-keyed answer, answers spread
// evenly is genuine confusion.
export default function QuizAnalyticsPage() {
  const { lessonId } = useParams();
  const { data, status, error } = useQuizAnalytics(lessonId);

  const back = (
    <Link className="lms-backlink" to="/learn/instructor/progress">
      <LmsIcon name="chevron" className="lms-backlink__icon" />
      Student progress
    </Link>
  );

  if (status === 'loading' || status === 'idle') {
    return (
      <div>
        <div className="lms-page__head"><div>{back}<h1 className="lms-page__title">Quiz</h1></div></div>
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '38%', height: 22 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            {back}
            <h1 className="lms-page__title">Quiz not found</h1>
            <p className="lms-page__subtitle">{error ?? 'This quiz doesn’t exist, or it isn’t yours.'}</p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/instructor/progress">
          Back to progress
        </Link>
      </div>
    );
  }

  const taken = data.learners > 0;

  return (
    <div>
      <div className="lms-page__head">
        <div>
          {back}
          <h1 className="lms-page__title">{data.lesson.title}</h1>
          <p className="lms-page__subtitle">
            {data.course.title} · pass at {data.passMark}%
          </p>
        </div>
        <div className="lms-page__actions">
          <Link className="lms-btn lms-btn--primary" to={`/learn/instructor/quizzes`}>
            <LmsIcon name="note" />
            Edit questions
          </Link>
        </div>
      </div>

      {!taken ? (
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="quiz" className="lms-blank__icon" />
            <h2>Nobody has taken this yet</h2>
            <p>
              Once learners start submitting, this page shows how each question performed
              and which ones are tripping people up.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            {[
              { icon: 'users', label: 'Taken by', value: data.learners, hint: `${data.attempts} attempts` },
              { icon: 'check', label: 'Pass rate', value: `${data.passRate}%`, hint: `${data.passed} of ${data.learners} passed` },
              { icon: 'chart', label: 'Average best', value: `${data.averageBest}%`, hint: `${data.averageFirst}% on the first go` },
              {
                icon: 'clock', label: 'Attempts to pass',
                value: data.averageAttemptsToPass ?? '—',
                hint: data.averageAttemptsToPass ? 'Among those who passed' : 'Nobody has passed',
              },
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

          <section className="lms-card" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="lessons" />
                Question by question
              </h2>
              <span className="lms-card__note">How often each one was answered correctly</span>
            </div>

            <ol className="lms-items">
              {data.questions.map((q) => {
                const note = verdict(q);
                return (
                  <li key={q._id} className={`lms-item${note ? ` is-${note.tone}` : ''}`}>
                    <div className="lms-item__head">
                      <span className="lms-review__num">{q.number}</span>
                      <div className="lms-item__id">
                        <p className="lms-item__prompt">{q.prompt}</p>
                        <p className="lms-item__meta">
                          {TYPE_LABEL[q.type] ?? q.type}
                          {q.skipped ? ` · skipped by ${q.skipped}` : ''}
                        </p>
                      </div>
                      <div className="lms-item__score">
                        <span className="lms-item__rate">
                          {q.asked ? `${q.correctRate}%` : '—'}
                        </span>
                        <span className="lms-roster__sub">
                          {q.correct} of {q.asked} correct
                        </span>
                      </div>
                    </div>

                    <ProgressBar percent={q.correctRate ?? 0} complete={q.correctRate === 100} />

                    {note ? (
                      <p className="lms-item__note">
                        <LmsIcon name={note.tone === 'note' ? 'eye' : 'lock'} />
                        {note.text}
                      </p>
                    ) : null}

                    {/* Where the wrong answers went. A single distractor taking
                        most of them is a different problem from an even spread. */}
                    {q.options.length ? (
                      <ul className="lms-choices">
                        {q.options.map((o) => {
                          const share = q.asked ? Math.round((o.chose / q.asked) * 100) : 0;
                          return (
                            <li
                              key={o.id}
                              className={`lms-choice${o.isAnswer ? ' is-answer' : ''}`}
                            >
                              <span className="lms-choice__text">
                                {o.isAnswer ? <LmsIcon name="check" /> : null}
                                {o.text}
                              </span>
                              <span className="lms-choice__bar">
                                <span
                                  className="lms-choice__fill"
                                  style={{ width: `${share}%` }}
                                />
                              </span>
                              <span className="lms-choice__pct">{share}%</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : q.type === 'text' ? (
                      <p className="lms-item__accepted">
                        Accepted:{' '}
                        {q.answer.length
                          ? q.answer.join(', ')
                          : 'nothing — this question cannot be marked correct'}
                      </p>
                    ) : (
                      <p className="lms-item__accepted">
                        Correct answer: {q.answer.join(', ') || 'not set'}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
