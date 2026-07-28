import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  // The hero's search field writes ?q= here.
  const [params] = useSearchParams();
  const query = (params.get('q') || '').trim();

  // resetKey replays the reveal animation whenever the list changes.
  const { ref, inView } = useInView({ resetKey: `${category}-${query}` });

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
        // A search spans the whole forum, so the category filter comes off —
        // otherwise a Win-page search would never surface an Award answer.
        const list = await questionsApi.list(
          query ? { limit: 100 } : { limit: 100, category },
        );
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
  }, [category, query]);

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

  // Match on title and body. The list is capped at 100 server-side, so this
  // filters what was fetched rather than issuing a second request.
  const visible = useMemo(() => {
    if (!query) return answers;
    const needle = query.toLowerCase();
    return answers.filter(
      (item) =>
        (item.title || '').toLowerCase().includes(needle) ||
        (item.body || '').toLowerCase().includes(needle),
    );
  }, [answers, query]);

  const tag = CATEGORY_LABEL[category] ?? CATEGORY_LABEL.win;
  const title = query ? `Results for “${query}”` : heading;

  return (
    <section ref={ref} className={`forum-answers${inView ? ' is-in' : ''}`}>
      <div className="forum-answers__inner">
        <div className="forum-answers__main">
          <h2 className="forum-answers__heading">{title}</h2>

          {status === 'loading' && <p className="forum-answers__empty">Loading questions…</p>}
          {status === 'error' && (
            <p className="forum-answers__empty">
              We couldn&apos;t load questions right now. Please try again shortly.
            </p>
          )}
          {status === 'ready' && visible.length === 0 && (
            <p className="forum-answers__empty">
              {query ? (
                <>
                  No questions match that search.{' '}
                  <Link className="forum-answers__clear" to="/forum">
                    Clear search
                  </Link>
                </>
              ) : (
                'No answered questions have been published yet.'
              )}
            </p>
          )}

          {status === 'ready' && visible.length > 0 && (
            <ul className="forum-answers__list">
              {visible.map((item, i) => (
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
