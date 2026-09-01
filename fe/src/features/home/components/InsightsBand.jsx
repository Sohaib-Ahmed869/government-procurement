import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { articlesApi } from '../../../api';
import { readCache, writeCache, hasCache } from '../../../api/cache.js';
import './InsightsBand.css';
import Arrow from '../../../components/shared/Arrow.jsx';

// The rail's own read, kept apart from the Insights page's hundred.
const CACHE_KEY = 'articles:home-rail';

// The Insights band on the single-page homepage (A1).
//
// Five articles: the first spans two tracks with its photograph beside the
// copy, the other four are ordinary cards below. That asymmetry is doing a job —
// a row of five equal cards gives a reader no way in, whereas a lead plus four
// gives them one obvious place to start and four alternatives to scan.
//
// A card shows the title, the meta line and the action, and no description.
// Insights are CMS content and the excerpt field was retired from the editor,
// so printing one would put copy on the homepage that no editor can change.
//
// Replaces the old LatestInsights rail, which was a three-up grid with its own
// layout language. This one is built from the hm-* band primitives in home.css
// so it keeps the rhythm of the sections either side of it.
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // en-US to match InsightsGrid, ArticleDetail and the CMS listing. An
  // Australian site arguably wants en-AU, but that is a site-wide call — one
  // component quietly formatting dates differently is worse than all of them
  // agreeing on the wrong locale.
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Measured from the article's own body at 200 words per minute — the same
// formula the Insights listing and the CMS editor use, so a card shows the same
// figure wherever it appears. The stored value is the fallback for when the
// body isn't in the response.
function readingMinutes(article) {
  const words = String(article.body || '')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  if (words) return Math.max(1, Math.round(words / 200));
  return article.readingMinutes > 0 ? article.readingMinutes : 0;
}

export default function InsightsBand() {
  const { audience } = useAudience();
  // Seeded from the tab's cache — see api/cache.js.
  const [articles, setArticles] = useState(() => readCache(CACHE_KEY) ?? []);
  const [status, setStatus] = useState(() => (hasCache(CACHE_KEY) ? 'ready' : 'loading'));

  // The rail's cards come from the CMS, so the reveal waits for them.
  const { ref, inView } = useInView({ ready: status !== 'loading' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // "Featured on homepage" articles come first; the remaining slots are
        // filled with the most recently published of the rest.
        const list = await articlesApi.list({ limit: 5, sort: '-featured -publishedAt' });
        if (!alive) return;
        writeCache(CACHE_KEY, (list || []).slice(0, 5));
        setArticles((list || []).slice(0, 5));
        setStatus('ready');
      } catch {
        if (alive) setStatus((current) => (current === 'ready' ? 'ready' : 'error'));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Still loading, errored, or genuinely empty: render nothing rather than an
  // empty band with a heading over it.
  if (status !== 'ready' || articles.length === 0) return null;

  const [lead, ...rest] = articles;

  return (
    <section
      ref={ref}
      id="insights"
      className={`hm-band hm-band--dark${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="home-insights-title"
    >
      <div className="hm-shell hm-band__head hm-reveal">
        <h2 className="hm-band__title" id="home-insights-title">
          Latest thinking
        </h2>
        <p className="hm-band__lede">
          Guidance on running and answering tenders, drawn from the engagements we are
          working on now.
        </p>
      </div>

      <div className="hm-shell">
        <div className="ib">
          {/* The lead spans two tracks and lays its photograph and copy side by
              side; the rest are ordinary cards. Same markup either way, so the
              two only differ by the modifier class. */}
          <Card article={lead} lead />
          {rest.map((article) => (
            <Card article={article} key={article._id || article.slug} />
          ))}
        </div>

        <Link className="hm-arrow" to="/insights">
          Read all insights <Arrow />
        </Link>
      </div>
    </section>
  );
}

// One article. `lead` widens it to two tracks and turns it side-by-side.
function Card({ article, lead = false }) {
  return (
    <Link
      className={`ib__card hm-reveal${lead ? ' ib__card--lead' : ''}`}
      to={`/insights/${article.slug}`}
    >
      <span className="ib__media">
        {article.heroImage?.url ? (
          <img src={article.heroImage.url} alt="" loading="lazy" />
        ) : (
          <span className="ib__media--empty" aria-hidden="true" />
        )}
      </span>

      <span className="ib__text">
        <Meta article={article} />
        <h3 className="ib__title">{article.title}</h3>
        <span className="ib__more">
          Read article <Arrow />
        </span>
      </span>
    </Link>
  );
}

// Category, date and reading time, in that order, on one line. Each part is
// dropped when the article doesn't carry it rather than printed empty.
//
// Spans rather than a <p>: the whole card is one <a>, and a paragraph inside a
// link is invalid where the link also wraps a heading.
function Meta({ article }) {
  const date = formatDate(article.publishedAt);
  const minutes = readingMinutes(article);
  return (
    <span className="ib__meta">
      {article.category?.name && <span className="ib__topic">{article.category.name}</span>}
      {date && <span>{date}</span>}
      {minutes > 0 && <span>{minutes} min read</span>}
    </span>
  );
}
