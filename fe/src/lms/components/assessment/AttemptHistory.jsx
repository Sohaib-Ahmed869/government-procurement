import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';

function when(iso) {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Past attempts at one quiz (L3). Shown on the start screen so a learner knows
// where they stand before retaking, and under the result so they can compare.
//
// Scores come from the attempt as the server marked and stored it. They used to
// be re-derived in the browser from the stored answers, which required shipping
// the answer key to the client to do it — the thing that made the whole quiz
// readable from devtools.
export default function AttemptHistory({ attempts = [], slug, quizId, currentId }) {
  if (!attempts.length) return null;

  const best = Math.max(...attempts.map((a) => a.percent ?? 0));

  return (
    <div className="lms-attempts">
      <div className="lms-attempts__head">
        <h3 className="lms-card__title" style={{ margin: 0 }}>
          <LmsIcon name="chart" />
          Previous attempts
        </h3>
        <span className="lms-attempts__best">Best {best}%</span>
      </div>

      <ul className="lms-attempts__list">
        {attempts.map((attempt, i) => {
          const id = String(attempt._id ?? attempt.id);
          const isCurrent = id === String(currentId ?? '');
          return (
            <li key={id} className={`lms-attempt${isCurrent ? ' is-current' : ''}`}>
              <span className="lms-attempt__num">#{attempts.length - i}</span>
              <span className="lms-attempt__body">
                <span className="lms-attempt__score">
                  {attempt.score} / {attempt.total}
                  <span> ({attempt.percent}%)</span>
                </span>
                <span className="lms-attempt__when">{when(attempt.submittedAt)}</span>
              </span>
              <span className={`lms-pill ${attempt.passed ? 'lms-pill--done' : 'lms-pill--due'}`}>
                {attempt.passed ? 'Passed' : 'Not passed'}
              </span>
              {isCurrent ? (
                <span className="lms-attempt__link is-current">Viewing</span>
              ) : (
                <Link
                  className="lms-attempt__link"
                  to={`/learn/courses/${slug}/quiz/${quizId}/result/${id}`}
                >
                  Review
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
