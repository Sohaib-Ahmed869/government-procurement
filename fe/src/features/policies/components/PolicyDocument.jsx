import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pagesApi } from '../../../api';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { POLICY_BY_SLUG, PLACEHOLDER_SECTIONS, PLACEHOLDER_INTRO } from '../policies.js';
import './PolicyDocument.css';
import Arrow from '../../../components/shared/Arrow.jsx';

// B5.3 — the long-form policy template.
//
// One component serves every policy. It takes its content from the CMS Pages
// module (B5.4) and falls back to the placeholder copy in policies.js when the
// CMS holds nothing for this slug, which is the state the whole page is built
// to survive: the structure is finished and waiting for the words.
//
// A CMS page can arrive in either of two shapes, because the Page model
// supports both. Structured `sections` are preferred, since they are what the
// contents list and the anchor links are built from. A single rich-text `body`
// is accepted too, but it produces a document with no contents list, so the
// CMS hint steers editors to sections.

// Stable, readable ids from headings, so an anchor survives an edit that only
// renumbers a section. Falls back to the index where a heading is missing.
function slugifyHeading(heading, i) {
  const base = String(heading || '')
    .toLowerCase()
    .replace(/^\s*\d+[.)]\s*/, '') // drop a leading "3." so renumbering is safe
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `section-${i + 1}`;
}

export default function PolicyDocument() {
  const { slug } = useParams();
  const { audience } = useAudience();
  const shown = useMountReveal();

  const policy = POLICY_BY_SLUG[slug];

  const [page, setPage] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setPage(null);
    (async () => {
      try {
        const found = await pagesApi.getBySlug(slug);
        if (alive) {
          setPage(found || null);
          setStatus('ready');
        }
      } catch {
        // A 404 is the normal state until the content is written, not an error
        // worth showing anybody. Anything else lands here too, and the outcome
        // is the same: fall back to the placeholder.
        if (alive) {
          setPage(null);
          setStatus('ready');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // What actually renders: CMS sections, else CMS rich-text body, else the
  // placeholder. `isPlaceholder` drives the banner and nothing else.
  const doc = useMemo(() => {
    const cmsSections = Array.isArray(page?.sections) ? page.sections.filter((s) => s?.heading || s?.body) : [];
    if (cmsSections.length) {
      return { kind: 'sections', sections: cmsSections, isPlaceholder: false };
    }
    if (page?.body && page.body.trim()) {
      return { kind: 'html', html: page.body, isPlaceholder: false };
    }
    return {
      kind: 'sections',
      sections: PLACEHOLDER_SECTIONS[slug] || [],
      isPlaceholder: true,
    };
  }, [page, slug]);

  // The contents list, and the ids the headings carry. Built once from whatever
  // is being rendered, so the two can never disagree.
  const toc = useMemo(() => {
    if (doc.kind !== 'sections') return [];
    return doc.sections
      .map((s, i) => ({ id: slugifyHeading(s.heading, i), heading: s.heading }))
      .filter((t) => t.heading);
  }, [doc]);

  if (!policy) {
    return (
      <article className="pol">
        <div className="pol__inner">
          <h1 className="pol__title">Policy not found</h1>
          <p className="pol__intro">
            We could not find that policy. <Link to="/policies">See all policies</Link>.
          </p>
        </div>
      </article>
    );
  }

  const title = page?.title || policy.title;
  const updated = page?.updatedLabel || '';
  const intro = PLACEHOLDER_INTRO[slug] || policy.summary;

  return (
    <article className={`pol${shown ? ' is-in' : ''}`} data-audience={audience}>
      <div className="pol__inner">
        <header className="pol__head">
          <Link className="pol__back" to="/policies">
            <Arrow direction="left" /> All policies
          </Link>

          <h1 className="pol__title">{title}</h1>
          {intro && <p className="pol__intro">{intro}</p>}
          {updated && <p className="pol__updated">Last updated: {updated}</p>}
        </header>

        {/* B5.5 — impossible to mistake for the live policy, on screen and on
            paper. Printed too, deliberately: a placeholder that prints clean is
            a placeholder that gets circulated as if it were the real thing. */}
        {doc.isPlaceholder && (
          <div className="pol-draft" role="note">
            <p className="pol-draft__title">This is placeholder text, not our policy.</p>
            <p className="pol-draft__body">
              The wording below is scaffolding used while this page was built. It has
              no legal effect and should not be relied on. The final policy is being
              prepared and will replace it here.
            </p>
          </div>
        )}

        {status === 'loading' && <p className="pol__loading">Loading…</p>}

        {status === 'ready' && (
          <div className="pol__layout">
            {/* B5.3 — in-page contents. Only where there is enough document to
                need one; over three sections a contents list is furniture. */}
            {toc.length > 3 && (
              <nav className="pol-toc" aria-label="On this page">
                <h2 className="pol-toc__title">On this page</h2>
                <ol className="pol-toc__list">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`}>{t.heading}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <div className="pol__body">
              {doc.kind === 'html' ? (
                // Same trust model as articles and courses: this is authored by
                // signed-in staff through the CMS editor, not by the public.
                // eslint-disable-next-line react/no-danger
                <div className="pol-prose" dangerouslySetInnerHTML={{ __html: doc.html }} />
              ) : (
                doc.sections.map((section, i) => {
                  const id = slugifyHeading(section.heading, i);
                  return (
                    <section className="pol-section" id={id} key={id}>
                      {section.heading && (
                        <h2 className="pol-section__heading">
                          {section.heading}
                          {/* A link to the heading itself, so a clause can be
                              sent to somebody rather than described to them. */}
                          <a
                            className="pol-section__anchor"
                            href={`#${id}`}
                            aria-label={`Link to "${section.heading}"`}
                          >
                            #
                          </a>
                        </h2>
                      )}
                      <SectionBody body={section.body} />
                    </section>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// A section body is either the placeholder shape (an array of paragraph strings
// and { list } blocks) or a plain string from the CMS. Both render here so the
// template does not care which source it is drawing from.
function SectionBody({ body }) {
  if (!body) return null;

  if (typeof body === 'string') {
    // CMS section bodies are plain text. Blank lines separate paragraphs, which
    // is what an editor typing into a textarea will naturally do.
    return (
      <>
        {body
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p, i) => (
            <p className="pol-section__p" key={i}>
              {p}
            </p>
          ))}
      </>
    );
  }

  return (
    <>
      {body.map((block, i) =>
        typeof block === 'string' ? (
          <p className="pol-section__p" key={i}>
            {block}
          </p>
        ) : (
          <ul className="pol-section__list" key={i}>
            {(block.list || []).map((li, j) => (
              <li key={j}>{li}</li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}
