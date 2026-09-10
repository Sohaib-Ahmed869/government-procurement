import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { lessonHref } from '../../utils/lessonHref.js';

// Answer text for the review, whichever input type produced it. `given` and
// `answer` both arrive from the server as arrays of option ids (or, for a short
// answer, of strings).
function label(item, ids) {
  const list = ids == null ? [] : Array.isArray(ids) ? ids : [ids];
  if (!list.length) return 'Not answered';
  if (item.type === 'text') return list.join(', ');
  if (item.type === 'boolean') return list[0] === 'true' ? 'True' : 'False';
  return list
    .map((id) => item.options?.find((o) => o.id === id)?.text ?? id)
    .join(', ');
}

// The marked result (L3): the headline score, then a per-question review with
// the explanation, which is the part that actually teaches.
//
// Everything here comes from the server. The answer key is in this payload
// because the attempt has already been marked — withholding it now would remove
// the only part of a quiz that teaches anything. Before submission it isn't
// sent at all.
export default function QuizResult({
  attempt,
  review = [],
  passMark,
  slug,
  next,
  onRetake,
  // Set once the course is finished. A quiz is often the LAST lesson, and
  // passing it is what issues the certificate — so on that pass the thing the
  // learner has earned is the certificate, not another lesson.
  certificateId,
}) {
  const { score, total, percent, passed } = attempt;
  // Where a learner who has just passed actually wants to go. Offered only on a
  // pass: sending somebody who scored 1/3 onward to the next lecture would be
  // walking them past the thing they got wrong.
  const onward = passed && next ? next : null;
  const finished = passed && !next && certificateId;

  return (
    <div>
      <div className={`lms-result${passed ? ' is-pass' : ' is-fail'}`}>
        <span className="lms-result__icon">
          <LmsIcon name={passed ? 'check' : 'lock'} />
        </span>
        <div>
          <p className="lms-result__label">{passed ? 'Passed' : 'Not passed'}</p>
          <p className="lms-result__score">
            {score} / {total} <span>({percent}%)</span>
          </p>
          <p className="lms-result__note">
            {passed
              ? 'This assessment counts towards your course completion.'
              : `You need ${passMark}% to pass. Review the answers below and try again.`}
          </p>
        </div>
      </div>

      <ol className="lms-review">
        {review.map((item, i) => {
          const given = Array.isArray(item.given) ? item.given : [];
          const answered = given.length > 0;
          return (
            <li
              key={item.question ?? i}
              className={`lms-review__item${item.correct ? ' is-correct' : ''}`}
            >
              <div className="lms-review__head">
                <span className="lms-review__num">{i + 1}</span>
                <p className="lms-review__prompt">{item.prompt}</p>
                <span className={`lms-pill ${item.correct ? 'lms-pill--done' : 'lms-pill--due'}`}>
                  {item.correct ? 'Correct' : answered ? 'Incorrect' : 'Skipped'}
                </span>
              </div>

              <dl className="lms-review__answers">
                <div>
                  <dt>Your answer</dt>
                  <dd className={item.correct ? '' : 'is-wrong'}>{label(item, given)}</dd>
                </div>
                {!item.correct ? (
                  <div>
                    <dt>{item.type === 'text' ? 'Accepted answers' : 'Correct answer'}</dt>
                    <dd className="is-right">{label(item, item.answer)}</dd>
                  </div>
                ) : null}
              </dl>

              {item.explanation ? (
                <p className="lms-review__why">{item.explanation}</p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* On a pass the primary action is FORWARD. Retake is still there — a
          learner may want a cleaner score — but it stops being the green button,
          because the thing they have earned is the next lesson. On a fail the
          arrangement is unchanged: retaking is the only sensible next move. */}
      <div className="lms-lessonnav">
        <Link className="lms-btn" to={`/learn/courses/${slug}`}>
          Back to course
        </Link>
        <div className="lms-lessonnav__mid">
          <button
            type="button"
            className={`lms-btn${onward ? '' : ' lms-btn--primary'}`}
            onClick={onRetake}
          >
            <LmsIcon name="arrow" />
            Retake quiz
          </button>
        </div>
        {onward ? (
          <Link className="lms-btn lms-btn--primary" to={lessonHref(slug, onward)}>
            {/* Just "Next", as it is at the foot of every lesson. It used to
                name the kind it was going to, with a three-way check that fell
                through to "Next video" for anything it did not recognise — so a
                reading or a YouTube lesson was announced as a video. Naming the
                kind was never worth the chance of naming it wrong, and the rail
                beside this already says what is coming. */}
            Next
            <LmsIcon name="arrow" />
          </Link>
        ) : finished ? (
          <Link className="lms-btn lms-btn--primary" to={`/learn/certificates/${certificateId}`}>
            View certificate
            <LmsIcon name="award" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
