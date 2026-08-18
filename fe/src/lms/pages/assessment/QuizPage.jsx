import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import QuizRunner from '../../components/assessment/QuizRunner.jsx';
import AttemptHistory from '../../components/assessment/AttemptHistory.jsx';
import { useQuiz } from '../../hooks/useQuiz.js';

// An auto-marked quiz (L3), from the API.
//
// The `:quizId` in the route is a LESSON id: a quiz is a lesson of kind 'quiz'.
// This screen used to read a hand-written question bank keyed by course slug,
// so every quiz an instructor actually built came back as "Quiz not found".
//
// Opens on a start screen rather than dropping the learner straight into a
// running timer, and that screen shows where they already stand, which is the
// point of keeping attempts.
export default function QuizPage() {
  const { slug, quizId } = useParams();
  // PlayerLayout has already loaded the course for the rail beside this.
  const { course } = useOutletContext() ?? {};
  const { status, error, lesson, quiz, attempts, attemptsUsed, maxAttempts, reloadAttempts } =
    useQuiz(quizId);
  const [started, setStarted] = useState(false);

  if (status === 'loading') {
    return (
      <div className="lms-lesson-page">
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '40%', height: 22 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (status !== 'ready') {
    const title =
      status === 'notfound'
        ? 'Quiz not found'
        : status === 'forbidden'
          ? 'This quiz isn’t open to you'
          : 'Couldn’t load this quiz';

    return (
      <div className="lms-lesson-page">
        <div className="lms-lesson-page__head">
          <h1 className="lms-lesson-page__title">{title}</h1>
        </div>
        <div className="lms-card">
          <p className="lms-empty">
            {status === 'notfound'
              ? 'This lesson isn’t a quiz, or it has been removed from the course.'
              : error}
          </p>
          <div style={{ textAlign: 'center' }}>
            <Link className="lms-btn lms-btn--primary" to={`/learn/courses/${slug}`}>
              Back to the course
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const questionCount = quiz.questions.length;
  // Scored by the server and stored with the attempt, so this is the mark that
  // was actually awarded rather than one re-derived in the browser.
  const best = attempts.length ? Math.max(...attempts.map((a) => a.percent ?? 0)) : null;
  const passedAlready = attempts.some((a) => a.passed);
  const attemptsLeft = maxAttempts > 0 ? Math.max(0, maxAttempts - attemptsUsed) : null;

  if (!questionCount) {
    return (
      <div className="lms-lesson-page">
        <div className="lms-lesson-page__head">
          <span className="lms-lesson-page__crumb">{course?.title}</span>
          <h1 className="lms-lesson-page__title">{lesson.title}</h1>
        </div>
        <div className="lms-card">
          <p className="lms-empty">
            No questions have been added to this quiz yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lms-lesson-page">
      <div className="lms-lesson-page__head">
        <span className="lms-lesson-page__crumb">{course?.title}</span>
        <h1 className="lms-lesson-page__title">{lesson.title}</h1>
      </div>

      <div className="lms-card">
        {started ? (
          <QuizRunner
            quiz={quiz}
            lessonId={quizId}
            slug={slug}
            onSubmitted={reloadAttempts}
          />
        ) : (
          <div className="lms-quiz__start">
            <span className="lms-quiz__start-icon">
              <LmsIcon name={passedAlready ? 'check' : 'quiz'} />
            </span>
            <h2>{attempts.length ? 'Take it again?' : 'Ready to start?'}</h2>
            <ul className="lms-quiz__facts">
              <li>
                <LmsIcon name="lessons" />
                {questionCount} question{questionCount === 1 ? '' : 's'}
              </li>
              {quiz.timeLimitMins ? (
                <li>
                  <LmsIcon name="clock" />
                  {quiz.timeLimitMins} minute limit
                </li>
              ) : (
                <li>
                  <LmsIcon name="clock" />
                  No time limit
                </li>
              )}
              <li>
                <LmsIcon name="check" />
                {quiz.passMark}% to pass
              </li>
              {best !== null ? (
                <li>
                  <LmsIcon name="chart" />
                  Best so far {best}%
                </li>
              ) : null}
              {attemptsLeft !== null ? (
                <li>
                  <LmsIcon name="lock" />
                  {attemptsLeft} of {maxAttempts} attempt{maxAttempts === 1 ? '' : 's'} left
                </li>
              ) : null}
            </ul>
            <p className="lms-quiz__start-note">
              {passedAlready
                ? 'You’ve already passed this one. Retaking it won’t remove your earlier result.'
                : `Marked as soon as you submit, with an explanation for every question.${
                    attemptsLeft === null
                      ? ' You can retake it as many times as you need.'
                      : ''
                  }`}
            </p>
            <button
              type="button"
              className="lms-btn lms-btn--primary"
              disabled={attemptsLeft === 0}
              onClick={() => setStarted(true)}
            >
              <LmsIcon name="play" />
              {attemptsLeft === 0
                ? 'No attempts left'
                : attempts.length
                  ? 'Start new attempt'
                  : 'Start quiz'}
            </button>
          </div>
        )}
      </div>

      {!started && attempts.length ? (
        <div className="lms-card" style={{ marginTop: 18 }}>
          <AttemptHistory attempts={attempts} slug={slug} quizId={quizId} />
        </div>
      ) : null}
    </div>
  );
}
