import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';

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
export default function QuizResult({ attempt, review = [], passMark, slug, onRetake }) {
  const { score, total, percent, passed } = attempt;

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

      <div className="lms-lessonnav">
        <Link className="lms-btn" to={`/learn/courses/${slug}`}>
          Back to course
        </Link>
        <div className="lms-lessonnav__mid">
          <button type="button" className="lms-btn lms-btn--primary" onClick={onRetake}>
            <LmsIcon name="arrow" />
            Retake quiz
          </button>
        </div>
        <span />
      </div>
    </div>
  );
}
