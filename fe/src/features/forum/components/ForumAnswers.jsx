import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { questionsApi } from '../../../api';
import { CATEGORY_LABEL } from '../data.js';
import ForumSidebar from './ForumSidebar.jsx';
import './ForumAnswers.css';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// When a question was published, as a sortable number.
//
// `publishedAt` is stamped on the first transition to Published and is the
// right answer whenever it is there. It is not always there: questions
// published before that stamp existed carry none, and the seed gives every
// question it creates the SAME timestamp — so a list ordered on that field
// alone falls back to whatever order Mongo happens to return for the ties, and
// the newest answer can land anywhere in the list. `createdAt` breaks those
// ties, and stands in entirely for the rows that never got a stamp.
function publishedTime(item) {
  const at = item?.publishedAt || item?.createdAt;
  const t = at ? new Date(at).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function excerpt(text, max = 240) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export default function ForumAnswers({ heading = 'Recent Answers', category = 'win', limit }) {
  // The hero's search field writes ?q= here.
  const [params] = useSearchParams();
  const query = (params.get('q') || '').trim();

  // resetKey replays the reveal animation whenever the list changes.
  const { ref, inView } = useInView({ resetKey: `${category}-${query}` });

  const [answers, setAnswers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        // A search spans the whole forum, so the category filter comes off —
        // otherwise a Win-page search would never surface an Award answer.
        // "all" is the sidebar's unfiltered view, so it drops the filter too.
        const list = await questionsApi.publicList(
          query || category === 'all' ? { limit: 100 } : { limit: 100, category },
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

  // Match on title and body. The list is capped at 100 server-side, so this
  // filters what was fetched rather than issuing a second request.
  //
  // Then newest first, whatever order the API returned. The server sorts too,
  // and between them nothing has to be true for this list to be in the order
  // its heading promises — which matters because the field it sorts on is not
  // set on every row (see publishedTime).
  const visible = useMemo(() => {
    const needle = query.toLowerCase();
    const matched = query
      ? answers.filter(
          (item) =>
            (item.title || '').toLowerCase().includes(needle) ||
            (item.body || '').toLowerCase().includes(needle),
        )
      : answers;
    // A copy: `answers` is state, and sort() works in place.
    const ordered = [...matched].sort((a, b) => publishedTime(b) - publishedTime(a));
    // The cap is applied AFTER the sort, so it is the newest N rather than the
    // first N the API happened to return — and it is dropped during a search,
    // where the visitor asked for matches rather than for what is recent.
    return limit && !query ? ordered.slice(0, limit) : ordered;
  }, [answers, query, limit]);

  const tag = CATEGORY_LABEL[category] ?? CATEGORY_LABEL.win;
  const title = query ? `Results for “${query}”` : heading;

  return (
    <section ref={ref} className={`forum-answers hm-band--light${inView ? ' is-in' : ''}`}>
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
                  <Link className="forum-answers__clear" to="/q-and-a">
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
                  <Link className="forum-card" to={`/q-and-a/answers/${item.slug || item._id}`}>
                    <h3 className="forum-card__title">{item.title}</h3>
                    <div className="forum-card__meta">
                      <span className="forum-tag">{CATEGORY_LABEL[item.category] ?? tag}</span>
                      {/* Same fallback the sort uses: a card with no
                          publishedAt stamp showed no date at all. */}
                      <span className="forum-card__date">
                        {formatDate(item.publishedAt || item.createdAt)}
                      </span>
                    </div>
                    <p className="forum-card__body">{excerpt(item.body)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ForumSidebar />
      </div>
    </section>
  );
}
