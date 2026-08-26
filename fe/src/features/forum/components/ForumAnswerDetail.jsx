import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { questionsApi } from '../../../api';
import { CATEGORY_LABEL } from '../data.js';
import ForumSidebar from './ForumSidebar.jsx';
import './ForumArticle.css';
import './ForumAnswerDetail.css';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ForumAnswerDetail() {
  const { id } = useParams();

  const { audience } = useAudience();
  const [answer, setAnswer] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound

  // resetKey includes status so the IntersectionObserver re-attaches once the
  // content section actually mounts (the ref isn't rendered during loading).
  const { ref, inView } = useInView({ resetKey: `${id}:${status}` });

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      // Links may carry a slug or, as a fallback, the raw id.
      let item = null;
      try {
        item = await questionsApi.publicGetBySlug(id);
      } catch {
        try {
          item = await questionsApi.publicGet(id);
        } catch {
          item = null;
        }
      }
      if (!alive) return;
      if (!item) {
        setStatus('notfound');
        return;
      }
      setAnswer(item);
      setStatus('ready');
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <section className="forum-article hm-band--light">
        <div className="forum-article__inner">
          <div className="forum-article__main">
            <p className="forum-article__q">Loading question…</p>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'notfound') {
    return (
      <section className="forum-article forum-answer-missing hm-band--light">
        <div className="forum-article__inner">
          <div className="forum-article__main">
            <h1 className="forum-article__title">Answer not found</h1>
            <p className="forum-answer-missing__text">
              We couldn&apos;t find the question you were looking for. It may have been moved or
              removed.
            </p>
            <Link className="forum-answer-missing__link" to="/q-and-a">
              Back to the forum
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const paragraphs = answer.answer?.paragraphs ?? [];
  const lessons = answer.answer?.lessons ?? [];

  return (
    <section
      ref={ref}
      className={`forum-article hm-band--light${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="forum-article__inner">
        <div className="forum-article__main">
          <h1 className="forum-article__title">{answer.title}</h1>
          <div className="forum-article__meta">
            <span className="forum-tag">{CATEGORY_LABEL[answer.category] ?? answer.category}</span>
            <span className="forum-article__date">{formatDate(answer.publishedAt)}</span>
          </div>

          <article className="forum-article__box">
            <h2 className="forum-article__box-heading">Question</h2>
            <p className="forum-article__q">{answer.body}</p>
          </article>

          <article className="forum-article__box">
            <h2 className="forum-article__box-heading">Answer</h2>
            {paragraphs.map((p, i) => (
              <p className="forum-article__p" key={i}>
                {p}
              </p>
            ))}

            {lessons.length > 0 && (
              <>
                <p className="forum-article__lesson-label">Key lessons:</p>
                <ul className="forum-article__lesson">
                  {lessons.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </article>

        </div>

        <ForumSidebar />
      </div>
    </section>
  );
}
