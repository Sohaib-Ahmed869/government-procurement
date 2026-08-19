import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { questionsApi } from '../../../api';
import './QandABand.css';

// Answered questions from the Q&A, most recent first.
//
// Only questions that actually carry an answer are shown. An unanswered one is
// a fair thing to have on the Q&A page itself — it shows the queue is real —
// but on the homepage it would be an advertisement for silence.
export default function QandABand() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    let alive = true;
    questionsApi
      .publicList({ limit: 8, sort: '-publishedAt' })
      .then((list) => {
        if (!alive) return;
        const answered = (list || []).filter((q) => q.answer?.paragraphs?.length > 0);
        setQuestions(answered.slice(0, 4));
      })
      .catch(() => {
        /* the band simply doesn't render */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (questions.length === 0) return null;

  return (
    <section
      ref={ref}
      id="q-and-a"
      className={`hm-band hm-band--light-2${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="home-qanda-title"
    >
      <div className="hm-shell hm-band__head hm-reveal">
        <h2 className="hm-band__title" id="home-qanda-title">
          Questions we have been asked
        </h2>
        <p className="hm-band__lede">
          Real questions from buyers and bidders, answered by the advisers who run these
          processes. Ask your own and we will answer it here.
        </p>
      </div>

      <div className="hm-shell">
        <ul className="qb__list">
          {questions.map((q) => (
            <li className="qb__item hm-reveal" key={q._id || q.slug}>
              <Link className="qb__link" to={`/q-and-a/answers/${q.slug || q._id}`}>
                <h3 className="qb__q">{q.title}</h3>
                {q.answer?.paragraphs?.[0] && (
                  <p className="qb__a">{q.answer.paragraphs[0]}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <Link className="hm-arrow" to="/q-and-a/submit">
          Ask a question <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
