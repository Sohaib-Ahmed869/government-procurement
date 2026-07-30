import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../../components/seo/Breadcrumbs.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { articlesApi } from '../../../api';
import './ArticleDetail.css';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Author may arrive as a plain string or as an object { name, role }.
function authorName(author) {
  if (!author) return '';
  return typeof author === 'string' ? author : author.name || '';
}
function authorRole(author) {
  return author && typeof author === 'object' ? author.role || '' : '';
}

function ShareRow() {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
        () => setCopied(false),
      );
    }
  };

  return (
    <div className="article-share">
      <span className="article-share__label">Share this article</span>
      <div className="article-share__buttons">
        <button type="button" className="article-share__button" onClick={onCopy}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

export default function ArticleDetail({ slug }) {
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const { audience } = useAudience();

  // resetKey includes status so the reveal observer re-attaches once the
  // content mounts (the ref isn't rendered during the loading state).
  const { ref, inView } = useInView({ resetKey: `${slug}:${status}` });

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const [item, list] = await Promise.all([
          articlesApi.getBySlug(slug),
          articlesApi.list({ limit: 4 }).catch(() => []),
        ]);
        if (!alive) return;
        if (!item) {
          setStatus('notfound');
          return;
        }
        setArticle(item);
        setRelated((list || []).filter((a) => a.slug !== slug).slice(0, 3));
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        // A 404 means the slug doesn't exist; anything else is a transient error.
        setStatus(err?.status === 404 ? 'notfound' : 'error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (status === 'loading') {
    return (
      <section className="article" data-audience={audience}>
        <div className="article-body">
          <p className="article-prose__lead">Loading article…</p>
        </div>
      </section>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <section className="article" data-audience={audience}>
        <div className="article-body">
          <h1 className="article-hero__title">
            {status === 'notfound' ? 'Article not found' : 'Something went wrong'}
          </h1>
          <p className="article-prose__lead">
            {status === 'notfound'
              ? "We couldn't find the article you were looking for. It may have been moved or removed."
              : "We couldn't load this article right now. Please try again shortly."}
          </p>
          <Link className="article-related__cta" to="/insights">
            Back to Insights
          </Link>
        </div>
      </section>
    );
  }

  const name = authorName(article.author);
  const role = authorRole(article.author);
  const initial = name ? name.charAt(0).toUpperCase() : '·';
  const date = formatDate(article.publishedAt);
  const heroUrl = article.heroImage?.url;

  return (
    <article ref={ref} className={`article${inView ? ' is-in' : ''}`} data-audience={audience}>
      <header className="article-hero">
        <div className="article-hero__inner">
          <div className="article-hero__meta">
            {article.category?.name && (
              <span className="article-hero__chip">{article.category.name}</span>
            )}
            {date && <span className="article-hero__date">{date}</span>}
          </div>
          <h1 className="article-hero__title">{article.title}</h1>
          {name && (
            <div className="article-hero__author">
              <span className="article-hero__avatar" aria-hidden="true">
                {initial}
              </span>
              <span className="article-hero__author-text">
                <span className="article-hero__author-name">{name}</span>
                {role && <span className="article-hero__author-role">{role}</span>}
              </span>
            </div>
          )}
        </div>
      </header>

      {heroUrl && (
        <figure className="article-figure">
          <img className="article-figure__img" src={heroUrl} alt="" />
        </figure>
      )}

      <div className="article-body">
        <Breadcrumbs items={[{ label: 'Insights', to: '/insights' }, { label: article.title }]} />

        {/* Body is authored HTML from the CMS. */}
        <div
          className="article-prose"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: article.body || '' }}
        />

        <aside className="article-cta">
          <div className="article-cta__text">
            <h2 className="article-cta__title">Get insights like this in your inbox</h2>
            <p className="article-cta__copy">
              Join procurement leaders getting our latest thinking on strategy, governance, and
              the tools reshaping the profession.
            </p>
          </div>
          <form
            className="article-cta__form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <input
              type="email"
              className="article-cta__input"
              placeholder="you@organisation.gov"
              aria-label="Email address"
            />
            <button type="submit" className="article-cta__button">
              Subscribe
            </button>
          </form>
        </aside>

        <ShareRow />
      </div>

      {related.length > 0 && (
        <section className="article-related">
          <div className="article-related__inner">
            <h2 className="article-related__title">Related insights</h2>
            <ul className="article-related__grid">
              {related.map((item) => (
                <li key={item._id} className="article-related__card">
                  <Link to={`/insights/${item.slug}`} className="article-related__link">
                    <div className="article-related__meta">
                      {item.category?.name && (
                        <span className="article-related__topic">{item.category.name}</span>
                      )}
                      <span className="article-related__date">{formatDate(item.publishedAt)}</span>
                    </div>
                    <h3 className="article-related__card-title">{item.title}</h3>
                    <span className="article-related__cta">Read article</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
