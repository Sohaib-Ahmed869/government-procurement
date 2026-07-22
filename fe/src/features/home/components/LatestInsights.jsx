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
        const list = await articlesApi.list({ limit: 3, sort: '-publishedAt' });
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
          <Link className="li__viewall" to="/resources">
            View all insights
            <span className="li__viewall-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="li__grid">
          {articles.map((article) => {
            const image = article.heroImage?.url;
            const date = formatDate(article.publishedAt);
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
                      {article.topic && <span className="li-card__topic">{article.topic}</span>}
                      {date && <span className="li-card__date">{date}</span>}
                    </div>
                    <h3 className="li-card__title">{article.title}</h3>
                    {article.excerpt && <p className="li-card__excerpt">{article.excerpt}</p>}
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
