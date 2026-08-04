import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { articlesApi } from '../../../api';
import './LatestInsights.css';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Measured from the article's own body at 200 words per minute — the same
// formula the Insights listing and the CMS editor use, so a card shows the same
// figure wherever it appears. The stored value is the fallback for when the body
// isn't in the response.
function readingMinutes(article) {
  const words = String(article.body || '')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  if (words) return Math.max(1, Math.round(words / 200));
  return article.readingMinutes > 0 ? article.readingMinutes : 0;
}

// The three most recent published articles, pulled from the CMS. Renders nothing
// until at least one article is available so an empty CMS leaves no gap.
export default function LatestInsights() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // "Featured on homepage" articles come first; any of the 3 slots left
        // over are filled with the most recently published of the rest.
        const list = await articlesApi.list({ limit: 3, sort: '-featured -publishedAt' });
        if (!alive) return;
        setArticles((list || []).slice(0, 3));
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Nothing to show (still loading, errored, or genuinely empty): render nothing
  // rather than a placeholder block on the homepage.
  if (status !== 'ready' || articles.length === 0) return null;

  return (
    <section ref={ref} className={`li${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="li__inner">
        <div className="li__head">
          <div>
            <p className="li__eyebrow">Insights</p>
            <h2 className="li__heading">Latest Insights</h2>
          </div>
          <Link className="li__viewall" to="/insights">
            View all insights
            <span className="li__viewall-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="li__grid">
          {articles.map((article) => {
            const image = article.heroImage?.url;
            const date = formatDate(article.publishedAt);
            const minutes = readingMinutes(article);
            return (
              <li key={article._id || article.slug} className="li-card">
                <Link className="li-card__inner" to={`/insights/${article.slug}`}>
                  <div className="li-card__media">
                    {image ? (
                      <img className="li-card__art" src={image} alt="" loading="lazy" />
                    ) : (
                      <div className="li-card__art li-card__art--empty" aria-hidden="true" />
                    )}
                  </div>
                  <div className="li-card__body">
                    <div className="li-card__meta">
                      {article.category?.name && (
                        <span className="li-card__topic">{article.category.name}</span>
                      )}
                      {date && <span className="li-card__date">{date}</span>}
                      {minutes > 0 && (
                        <span className="li-card__read">{minutes} min read</span>
                      )}
                    </div>
                    <h3 className="li-card__title">{article.title}</h3>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
