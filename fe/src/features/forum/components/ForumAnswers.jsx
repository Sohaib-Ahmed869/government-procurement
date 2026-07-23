import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { questionsApi } from '../../../api';
import ForumSidebar from './ForumSidebar.jsx';
import './ForumAnswers.css';

const CATEGORY_LABEL = {
  win: 'Win Contracts',
  award: 'Award Contracts',
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function excerpt(text, max = 240) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export default function ForumAnswers({ heading = 'Recent Answers', category = 'win' }) {
  // resetKey replays the reveal animation whenever the category changes.
  const { ref, inView } = useInView({ resetKey: category });

  const [answers, setAnswers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  // Featured questions for the sidebar (published + featured). Empty => the
  // sidebar hides the whole "Featured Questions" block.
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const list = await questionsApi.list({ limit: 100, category });
        if (!alive) return;
        setAnswers(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [category]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await questionsApi.list({ featured: true, limit: 20 });
        if (!alive) return;
        setFeatured(
          (list || []).map((q) => ({
            label: q.title,
            href: `/forum/answers/${q.slug || q._id}`,
          })),
        );
      } catch {
        /* sidebar just stays empty */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const tag = CATEGORY_LABEL[category] ?? CATEGORY_LABEL.win;

  return (
    <section ref={ref} className={`forum-answers${inView ? ' is-in' : ''}`}>
      <div className="forum-answers__inner">
        <div className="forum-answers__main">
          <h2 className="forum-answers__heading">{heading}</h2>

          {status === 'loading' && <p className="forum-answers__empty">Loading questions…</p>}
          {status === 'error' && (
            <p className="forum-answers__empty">
              We couldn&apos;t load questions right now. Please try again shortly.
            </p>
          )}
          {status === 'ready' && answers.length === 0 && (
            <p className="forum-answers__empty">No answered questions have been published yet.</p>
          )}

          {status === 'ready' && answers.length > 0 && (
            <ul className="forum-answers__list">
              {answers.map((item, i) => (
                <li key={item._id} style={{ '--i': i }}>
                  <Link className="forum-card" to={`/forum/answers/${item.slug || item._id}`}>
                    <h3 className="forum-card__title">{item.title}</h3>
                    <div className="forum-card__meta">
                      <span className="forum-tag">{CATEGORY_LABEL[item.category] ?? tag}</span>
                      <span className="forum-card__date">{formatDate(item.publishedAt)}</span>
                    </div>
                    <p className="forum-card__body">{excerpt(item.body)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ForumSidebar featured={featured} />
      </div>
    </section>
  );
}
