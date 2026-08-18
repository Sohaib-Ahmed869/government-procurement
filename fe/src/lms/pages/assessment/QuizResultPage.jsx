import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import QuizResult from '../../components/assessment/QuizResult.jsx';
import AttemptHistory from '../../components/assessment/AttemptHistory.jsx';
import { quizzesApi } from '../../../api/lms.js';

// A marked attempt at its own URL (L3).
//
// The runner hands the marked result over in router state, so arriving straight
// from a submission paints without a second round trip. Everything else — a
// refresh, a bookmark, "Review" from the attempt history — fetches the attempt
// by id, which is what makes this URL worth having.
//
// Attempts live on the server against the learner's account, so a result opened
// on another device resolves. The old local store meant a link was only good in
// the browser that made it.
export default function QuizResultPage() {
  const { slug, quizId, attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { course } = useOutletContext() ?? {};

  const handed = location.state?.result;
  const [data, setData] = useState(
    handed ? { ...handed, title: handed.title ?? '' } : null,
  );
  const [status, setStatus] = useState(handed ? 'ready' : 'loading');
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Always refresh the history; it is what puts this attempt in context.
      try {
        const rows = await quizzesApi.attempts(quizId);
        if (alive) setAttempts(rows);
      } catch {
        /* the result still stands on its own */
      }

      if (handed) return;
      try {
        const result = await quizzesApi.attempt(attemptId);
        if (alive) {
          setData(result);
          setStatus('ready');
        }
      } catch {
        if (alive) setStatus('notfound');
      }
    })();
    return () => {
      alive = false;
    };
  }, [attemptId, quizId, handed]);

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

  if (status !== 'ready' || !data?.attempt) {
    return (
      <div className="lms-lesson-page">
        <div className="lms-lesson-page__head">
          <h1 className="lms-lesson-page__title">Attempt not found</h1>
        </div>
        <div className="lms-card">
          <p className="lms-empty">
            This attempt isn’t available. It may belong to a different account, or the
            quiz it was taken on has been removed.
          </p>
          <div style={{ textAlign: 'center' }}>
            <Link className="lms-btn lms-btn--primary" to={`/learn/courses/${slug}/quiz/${quizId}`}>
              Back to the quiz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lms-lesson-page">
      <div className="lms-lesson-page__head">
        <span className="lms-lesson-page__crumb">{course?.title} · Result</span>
        <h1 className="lms-lesson-page__title">{data.title || 'Quiz result'}</h1>
      </div>

      <div className="lms-card">
        <QuizResult
          attempt={data.attempt}
          review={data.review}
          passMark={data.passMark}
          slug={slug}
          onRetake={() => navigate(`/learn/courses/${slug}/quiz/${quizId}`)}
        />
      </div>

      {attempts.length > 1 ? (
        <div className="lms-card" style={{ marginTop: 18 }}>
          <AttemptHistory
            attempts={attempts}
            slug={slug}
            quizId={quizId}
            currentId={data.attempt._id}
          />
        </div>
      ) : null}
    </div>
  );
}
