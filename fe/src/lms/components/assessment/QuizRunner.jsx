import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import QuestionCard from './QuestionCard.jsx';
import { quizzesApi } from '../../../api/lms.js';
import { formatTime } from '../../utils/transcript.js';

// The attempt itself (L3). One question at a time with a jump strip, a countdown
// when the quiz is timed, and auto-submission when it runs out.
//
// Only the ANSWERS are sent. The server marks the attempt against a key that
// never left the database and returns the score, so a learner can post what
// they chose and never what they scored. A score in this request body would be
// ignored.
//
// Submitting navigates to the attempt's own result URL rather than swapping the
// result in place, so a refresh doesn't lose it and the result can be linked
// to. The marked result rides along in router state so the result screen can
// paint immediately; it can also fetch the attempt by id, which is what makes
// that link work tomorrow.
export default function QuizRunner({ quiz, lessonId, slug, onSubmitted,
  ticket,
}) {
  const navigate = useNavigate();
  // PlayerLayout hands this down so a child that moves progress can tell the
  // shell to re-read it. Taken from the context rather than from a prop for the
  // same reason useLesson does: one place to get it right, and a screen that
  // renders the runner cannot forget to pass it on.
  const { reloadOutline } = useOutletContext() ?? {};
  const [answers, setAnswers] = useState({});
  const [i, setI] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState((quiz.timeLimitMins ?? 0) * 60);
  // Wall-clock, for the duration recorded against the attempt.
  const startedAt = useRef(Date.now());
  // Guards against a double submission: the timer hitting zero at the same
  // moment the learner clicks Submit would otherwise post two attempts.
  const sent = useRef(false);

  const question = quiz.questions[i];
  const isAnswered = (q) => {
    const a = answers[q.id];
    return a != null && (Array.isArray(a) ? a.length > 0 : String(a).trim() !== '');
  };
  const answered = useMemo(
    () => quiz.questions.filter(isAnswered).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answers, quiz.questions],
  );

  const submit = useCallback(async () => {
    if (sent.current) return;
    sent.current = true;
    setSubmitting(true);
    setError('');

    // The shape markAttempt() reads: one entry per answered question, keyed by
    // the question's own id. Questions left out score zero rather than being
    // skipped, so there is nothing to send for them.
    const payload = quiz.questions
      .filter((q) => answers[q.id] != null)
      .map((q) => ({
        question: q.id,
        given: Array.isArray(answers[q.id]) ? answers[q.id] : [answers[q.id]],
      }));

    try {
      const result = await quizzesApi.submit(
        lessonId,
        payload,
        Math.round((Date.now() - startedAt.current) / 1000),
        ticket,
      );
      onSubmitted?.();
      /* The player shell fetched the outline when it mounted and has no idea
         this just happened, so its rail and its percentage keep showing the
         course as it was — a passed quiz left its circle unticked and the bar
         where it started. The same call useLesson makes after a completion,
         for the same reason; it is awaited so the result screen renders against
         a refreshed rail rather than one that ticks a moment later. */
      await reloadOutline?.();
      navigate(
        `/learn/courses/${slug}/quiz/${lessonId}/result/${result.attempt._id}`,
        { state: { result } },
      );
    } catch (err) {
      // Letting them try again is the only useful response: the answers are
      // still on screen, and this is usually the connection rather than the
      // attempt being refused.
      sent.current = false;
      setError(err?.message ?? 'Your attempt didn’t reach us. Try submitting again.');
      setSubmitting(false);
    }
  }, [answers, quiz.questions, lessonId, slug, navigate, onSubmitted, reloadOutline, ticket]);

  // Countdown. Submits whatever is answered when it hits zero rather than
  // discarding the attempt.
  useEffect(() => {
    if (!quiz.timeLimitMins || sent.current) return undefined;
    if (remaining <= 0) {
      submit();
      return undefined;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, quiz.timeLimitMins, submit]);

  const low = quiz.timeLimitMins && remaining <= 60;

  return (
    <div>
      <div className="lms-quiz__bar">
        <span className="lms-quiz__count">
          Question {i + 1} of {quiz.questions.length}
        </span>
        <div className="lms-quiz__dots">
          {quiz.questions.map((q, qi) => (
            <button
              key={q.id}
              type="button"
              className={`lms-quiz__dot${qi === i ? ' is-current' : ''}${
                isAnswered(q) ? ' is-answered' : ''
              }`}
              onClick={() => setI(qi)}
              aria-label={`Go to question ${qi + 1}${isAnswered(q) ? ' (answered)' : ''}`}
              aria-current={qi === i ? 'true' : undefined}
            >
              {qi + 1}
            </button>
          ))}
        </div>
        {quiz.timeLimitMins ? (
          <span className={`lms-quiz__timer${low ? ' is-low' : ''}`}>
            <LmsIcon name="clock" />
            {formatTime(remaining)}
          </span>
        ) : (
          <span />
        )}
      </div>

      <QuestionCard
        question={question}
        value={answers[question.id]}
        disabled={submitting}
        onChange={(v) => setAnswers((a) => ({ ...a, [question.id]: v }))}
      />

      {error ? <p className="lms-field__error">{error}</p> : null}

      <div className="lms-lessonnav">
        <button type="button" className="lms-btn" disabled={i === 0} onClick={() => setI(i - 1)}>
          <LmsIcon name="chevron" className="lms-lessonnav__prev-icon" />
          Previous
        </button>

        <div className="lms-lessonnav__mid">
          <span className="lms-quiz__progress">
            {answered} of {quiz.questions.length} answered
          </span>
        </div>

        {i < quiz.questions.length - 1 ? (
          <button type="button" className="lms-btn lms-btn--primary" onClick={() => setI(i + 1)}>
            Next
            <LmsIcon name="arrow" />
          </button>
        ) : (
          <button
            type="button"
            className="lms-btn lms-btn--primary"
            onClick={submit}
            disabled={submitting}
          >
            <LmsIcon name="check" />
            {submitting ? 'Marking…' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
}
