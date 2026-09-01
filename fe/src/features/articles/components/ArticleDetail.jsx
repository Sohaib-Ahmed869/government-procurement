import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { useReadingProgress } from '../../../hooks/useReadingProgress.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { articlesApi, teamApi } from '../../../api';
import ArticleBar from './ArticleBar.jsx';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
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
        const [item, people] = await Promise.all([
          articlesApi.getBySlug(slug),
          teamApi.list({ limit: 100 }).catch(() => []),
        ]);
        if (!alive) return;
        if (!item) {
          setStatus('notfound');
          return;
        }
        setArticle(item);
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

  // The wait is blank on purpose: the article fades in when it arrives, and a
  // "Loading article…" line that has to be cleared before it can is a second
  // arrival in front of the first. The band still paints the page's ground, so
  // the header above it isn't left sitting on bare white.
  if (status === 'loading') {
    return (
      <section className="article" data-audience={audience}>
        <LoadingStatus loading label="Loading article" />
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
          <Link className="article-back" to="/insights">
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
    <div ref={ref} className={`article${inView ? ' is-in' : ''}`} data-audience={audience}>
      {/* The band is the <section>, and the shell inside it is what fades.
          These were the other way round: the page ground sat on the outer
          element and each band was one of its children, so the A3 cross-fade —
          which targets `:is(section, header, article) > *` — faded the BANDS
          themselves. Fading a dark band to nothing shows whatever is behind it,
          and behind it was this page's own paper: the white flash on every
          toggle. Same correction the tender page needed, and the same shape
          Service Offering already had. */}
      {/* B1.3 / B1.8 — title, progress and the actions, at every scroll depth. */}
      <ArticleBar title={article.title} progress={progress} article={article} />

      {/* Title panel on the left, hero image running to the right edge. */}
      <header className={`article-hero${heroUrl ? '' : ' article-hero--plain'}`}>
        <div className="article-hero__panel">
          <div className="article-hero__panel-inner">
            <h1 className="article-hero__title">{article.title}</h1>
            {/* Date | category | read time | byline.

                The byline used to sit on its own rule under the hero, at the
                top of the body. It is the same kind of fact as the date and the
                read time — who, when, how long — so it belongs on the same line
                as them rather than a band lower on its own. */}
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
              {name && (
                <>
                  <span className="article-hero__sep">|</span>
                  <span className="article-hero__byline">
                    By{' '}
                    {authorHref ? (
                      <Link className="article-hero__byline-link" to={authorHref}>
                        {name}
                      </Link>
                    ) : (
                      <span className="article-hero__byline-name">{name}</span>
                    )}
                  </span>
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
          it is not the article. */}
      <section className="article-body" ref={bodyRef}>
        {/* The byline that used to open this section has moved up into the
            hero's meta line, beside the read time. The share row that sat
            beside it moved into ArticleBar, which stays with the reader. */}
        {article.overview && <p className="article-overview">{article.overview}</p>}

        {/* Body is authored HTML from the CMS. */}
        <div
          className="article-prose"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: article.body || '' }}
        />
      </section>

    </div>
  );
}
