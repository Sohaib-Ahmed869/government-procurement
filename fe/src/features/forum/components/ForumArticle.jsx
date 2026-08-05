import { useState, useEffect } from 'react';
import { useInView } from '../../../hooks/useInView.js';
import { questionsApi } from '../../../api';
import { CATEGORY_LABEL } from '../data.js';
import ForumSidebar from './ForumSidebar.jsx';
import './ForumArticle.css';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ForumArticle() {
  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | empty

  // resetKey includes status so the reveal animation replays once the ready
  // content actually mounts (the ref isn't rendered during loading).
  const { ref, inView } = useInView({ resetKey: `${article?._id ?? 'none'}:${status}` });

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        // A featured/most-recent published question drives the article page.
        const list = await questionsApi.publicList({ limit: 1, category: 'win' });
        if (!alive) return;
        const item = (list || [])[0] ?? null;
        if (!item) {
          setStatus('empty');
          return;
        }
        setArticle(item);
        setStatus('ready');
      } catch {
        if (alive) setStatus('empty');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <section className="forum-article">
        <div className="forum-article__inner">
          <div className="forum-article__main">
            <p className="forum-article__q">Loading question…</p>
          </div>
          <ForumSidebar />
        </div>
      </section>
    );
  }

  if (status === 'empty' || !article) {
    return (
      <section className="forum-article">
        <div className="forum-article__inner">
          <div className="forum-article__main">
            <h1 className="forum-article__title">No questions yet</h1>
            <p className="forum-article__q">
              No answered questions have been published yet. Please check back shortly.
            </p>
          </div>
          <ForumSidebar />
        </div>
      </section>
    );
  }

  const paragraphs = article.answer?.paragraphs ?? [];
  const lessons = article.answer?.lessons ?? [];

  return (
    <section ref={ref} className={`forum-article${inView ? ' is-in' : ''}`}>
      <div className="forum-article__inner">
        <div className="forum-article__main">
          <h1 className="forum-article__title">{article.title}</h1>
          <div className="forum-article__meta">
            <span className="forum-tag">{CATEGORY_LABEL[article.category] ?? article.category}</span>
            <span className="forum-article__date">{formatDate(article.publishedAt)}</span>
          </div>

          <article className="forum-article__box">
            <h2 className="forum-article__box-heading">Question</h2>
            <p className="forum-article__q">{article.body}</p>
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
                <p className="forum-article__lesson-label">Lesson:</p>
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
