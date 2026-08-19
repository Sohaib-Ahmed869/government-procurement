import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { useReadingProgress } from '../../../hooks/useReadingProgress.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { articlesApi, teamApi } from '../../../api';
import ArticleBar from './ArticleBar.jsx';
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

// The byline links to the writer's profile — but only when there is one to open.
// Members are stored with hasProfile false until a profile page is filled in,
// and /our-team/<slug> is only rendered for those that have it.
function profilePath(team, name) {
  if (!name) return null;
  const member = team.find((m) => m.name === name);
  return member?.hasProfile && member.slug ? `/our-team/${member.slug}` : null;
}

export default function ArticleDetail({ slug }) {
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [team, setTeam] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const { audience } = useAudience();

  // resetKey includes status so the reveal observer re-attaches once the
  // content mounts (the ref isn't rendered during the loading state).
  //
  // `threshold: 0` rather than the default 0.15, because the element being
  // watched is the whole article. A long article is several times the height of
  // the viewport, so the fraction of it ever on screen at once is smaller than
  // the default threshold and the observer never fires: the body stays at
  // opacity 0 and the article is invisible. Measured on this article, a phone
  // could see 10.6% of it at most against a 15% threshold. Any part of it
  // arriving is the right trigger for "start reading".
  const { ref, inView } = useInView({
    threshold: 0,
    resetKey: `${slug}:${status}`,
  });

  // B1.1 — progress is measured against the prose itself, not the page. The
  // offset is the sticky chrome plus the reading bar, so "read" means "has
  // passed above the last line the reader can actually see".
  const [bodyRef, progress] = useReadingProgress();

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        // The team list is only needed to resolve the byline link, so a failure
        // there leaves the name as plain text rather than failing the page.
        const [item, list, people] = await Promise.all([
          articlesApi.getBySlug(slug),
          articlesApi.list({ limit: 4 }).catch(() => []),
          teamApi.list({ limit: 100 }).catch(() => []),
        ]);
        if (!alive) return;
        if (!item) {
          setStatus('notfound');
          return;
        }
        setArticle(item);
        setRelated((list || []).filter((a) => a.slug !== slug).slice(0, 3));
        setTeam(people || []);
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
          <p className="article-overview">Loading article…</p>
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
          <p className="article-overview">
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
  const authorHref = profilePath(team, name);
  const date = formatDate(article.publishedAt);
  const heroUrl = article.heroImage?.url;
  const kind = article.category?.name || 'Article';

  return (
    <article ref={ref} className={`article${inView ? ' is-in' : ''}`} data-audience={audience}>
      {/* B1.3 / B1.8 — title, progress and the actions, at every scroll depth. */}
      <ArticleBar title={article.title} progress={progress} article={article} />

      {/* Title panel on the left, hero image running to the right edge. */}
      <header className={`article-hero${heroUrl ? '' : ' article-hero--plain'}`}>
        <div className="article-hero__panel">
          <div className="article-hero__panel-inner">
            <h1 className="article-hero__title">{article.title}</h1>
            <p className="article-hero__meta">
              {date && <span>{date}</span>}
              {date && <span className="article-hero__sep">|</span>}
              <span>{kind}</span>
              {article.readingMinutes > 0 && (
                <>
                  <span className="article-hero__sep">|</span>
                  <span>{article.readingMinutes} min read</span>
                </>
              )}
            </p>
          </div>
        </div>
        {heroUrl && (
          <div className="article-hero__media">
            <img src={heroUrl} alt={article.heroImage?.alt || ''} />
          </div>
        )}
      </header>

      {/* The progress bar measures this element, not the page: the hero above
          and the related grid below are not the article. */}
      <div className="article-body" ref={bodyRef}>
        <div className="article-byline">
          {name && (
            <p className="article-byline__author">
              By{' '}
              {authorHref ? (
                <Link className="article-byline__link" to={authorHref}>
                  {name}
                </Link>
              ) : (
                <span className="article-byline__name">{name}</span>
              )}
            </p>
          )}
          {/* The share row that used to sit here has moved into ArticleBar,
              which stays with the reader. Keeping both would put the same
              actions on the page twice. */}
        </div>

        {article.overview && <p className="article-overview">{article.overview}</p>}

        {/* Body is authored HTML from the CMS. */}
        <div
          className="article-prose"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: article.body || '' }}
        />
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
