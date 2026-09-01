import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pagesApi } from '../../../api';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { POLICY_BY_SLUG, POLICY_SECTIONS } from '../policies.js';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
import './PolicyDocument.css';

// B5.3 — the long-form policy template.
//
// One component serves every policy. The approved text lives in policies.js;
// a page published in the CMS Pages module (B5.4) under the matching slug can
// override it. See the note on `doc` below for which wins when.
//
// A CMS page can arrive in either of two shapes, because the Page model
// supports both. Structured `sections` are preferred, since they are what the
// contents list is built from. A single rich-text `body` is accepted too, but
// it produces a document with no contents list, so the CMS hint steers editors
// to sections.

// Stable, readable ids from headings, so a link into a section survives an edit
// that only renumbers it. Falls back to the index where a heading is missing.
// The ids stay on the sections and the contents list links to them; what was
// removed is the "#" that used to be drawn beside each heading.
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

  const policy = POLICY_BY_SLUG[slug];

  const [page, setPage] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Held until the document is here, so it fades in rather than appearing into
  // a section that has already finished revealing.
  //
  // This drives the BODY alone. The title is painted from the first frame and
  // never animates — see the note on the reveal block in PolicyDocument.css:
  // it sits directly under the site header on a page the visitor has just been
  // sent to the top of, and lifting it into place there reads as the page
  // settling rather than as an entrance.
  const shown = useMountReveal(slug, { ready: status !== 'loading' });

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

  /* What actually renders, in order: CMS sections, else the approved document
     in policies.js, else a CMS rich-text body.

     THE MIDDLE TWO USED TO BE THE OTHER WAY ROUND, and the swap matters.

     While policies.js held placeholder scaffolding, anything an editor had
     written was better than it, so any CMS page won. policies.js holds the
     approved documents now, and that inverts: a rich-text body is not
     automatically better than the policy of record. It was not a hypothetical
     — two stub pages, each a single sentence, were published in the CMS under
     `privacy` and `terms`, and they hid the real Privacy Policy and Terms of
     Use completely.

     Structured CMS sections still win outright. That is the shape the CMS hint
     steers editors to, it is what the contents list, the anchors and the print
     rules are built from, and an editor who has written one has written a
     policy rather than left a placeholder. So a policy can still be revised
     without a deploy — it just has to be revised as sections.

     A rich-text body still renders for any slug policies.js does not carry, so
     nothing an editor writes is lost; it is only outranked where an approved
     document exists to outrank it.

     B5.5's "this is placeholder text" banner has been removed. It was drawn
     from `isPlaceholder`, which is true on the first paint of EVERY policy —
     the CMS fetch has not resolved yet, so the fallback is what `doc` holds —
     and then went away a second later when the real page arrived. A warning
     that flashes on a published policy and retracts itself is worse than no
     warning: nobody reads it in time, and everybody sees it. */
  const doc = useMemo(() => {
    const cmsSections = Array.isArray(page?.sections) ? page.sections.filter((s) => s?.heading || s?.body) : [];
    if (cmsSections.length) {
      return { kind: 'sections', sections: cmsSections };
    }
    const published = POLICY_SECTIONS[slug];
    if (published?.length) {
      return { kind: 'sections', sections: published };
    }
    if (page?.body && page.body.trim()) {
      return { kind: 'html', html: page.body };
    }
    return { kind: 'sections', sections: [] };
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
            We could not find that policy. It may have been moved or renamed.
          </p>
        </div>
      </article>
    );
  }

  // From whatever is actually being rendered. Taking the CMS title while
  // showing the repo's document put "Terms of Use" over the Website Terms of
  // Use — a document naming itself something other than what it is.
  const title = doc.kind === 'html' ? page?.title || policy.title : policy.title;

  return (
    <article className={`pol${shown ? ' is-in' : ''}`} data-audience={audience}>
      <div className="pol__inner">
        <header className="pol__head">
          {/* The title alone. The intro under it restated the policy's own
              name in a sentence, and the "Last updated" line dated a document
              whose date is in the document. Both sat between the heading and
              the contents, which is what a reader came for. */}
          <h1 className="pol__title">{title}</h1>
        </header>

        <LoadingStatus loading={status === 'loading'} label="Loading" />

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
                      {/* No "#" link on the heading. It was there so a clause
                          could be sent to somebody rather than described, but
                          the id is still on the <section> and the contents list
                          still links to it — so the anchors survive and can be
                          copied from the contents. What the "#" added was a
                          character that appeared on hover next to every heading
                          and, clicked, only jumped the page to a heading you
                          were already reading. */}
                      {section.heading && (
                        <h2 className="pol-section__heading">{section.heading}</h2>
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

/* Turn an email address in policy text into a link you can click.

   These documents route everything through one address — access requests,
   complaints, permission requests, removal requests, IP notices — and print it
   about thirty times between them. As plain text every one of those is an
   address to select and copy by hand, which is friction on the exact sentence
   telling somebody how to exercise a right.

   Applied at render rather than baked into policies.js, so the stored text
   stays a faithful copy of the approved document and the linking is a property
   of the page. Emails only: a bare-word URL like "govprocurement.com.au" has no
   scheme, and guessing one is how a policy ends up linking somewhere it did not
   say. */
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function Linkify({ text }) {
  if (!text) return null;
  const str = String(text);
  const found = str.match(EMAIL_RE);
  // The overwhelmingly common case, and it returns the string itself rather
  // than a wrapper — nothing is added to the DOM for a paragraph with no
  // address in it.
  if (!found) return str;

  const parts = str.split(EMAIL_RE);
  const nodes = [];
  parts.forEach((part, i) => {
    // Splitting on an address that opens or closes the string leaves an empty
    // segment at that end. Pushed as-is it becomes an empty span between the
    // text and the link.
    if (part) nodes.push(part);
    if (found[i]) {
      // The address can carry a trailing full stop from the sentence it sits
      // in — "...contact us at name@example.com." — and the regex stops before
      // it, so the punctuation stays in the following `part` rather than in
      // the href.
      nodes.push(
        <a className="pol-mail" key={`m${i}`} href={`mailto:${found[i]}`}>
          {found[i]}
        </a>,
      );
    }
  });
  return <>{nodes}</>;
}

// A section body is either the structured shape from policies.js or a plain
// string from the CMS. Both render here so the template does not care which
// source it is drawing from.
//
// The structured shape carries five kinds of block. Paragraphs and lists were
// here already; sub-headings, bold lead-ins and tables came with the approved
// documents, which use all three to carry meaning — a retention schedule is a
// table, and flattening it to prose is a different document.
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
              <Linkify text={p} />
            </p>
          ))}
      </>
    );
  }

  return (
    <>
      {body.map((block, i) => {
        if (typeof block === 'string') {
          return (
            <p className="pol-section__p" key={i}>
              <Linkify text={block} />
            </p>
          );
        }

        /* The contact block at the foot of a policy: a name, a trading name, an
           email, sometimes a phone line. One line each, as the approved
           document sets it — run together into a sentence it stops being an
           address and becomes a list of facts with no shape.

           <address>, which is what the element is for, and which tells a screen
           reader this is contact detail rather than another paragraph. */
        if (block.lines) {
          return (
            <address className="pol-section__address" key={i}>
              {block.lines.map((line, j) => (
                <span key={j}>
                  <Linkify text={line} />
                </span>
              ))}
            </address>
          );
        }

        // A sub-heading inside a section. <h3>, so it sits under the section's
        // <h2> in the outline a screen reader announces — the visual step down
        // is not the only thing that has to be true here.
        if (block.sub) {
          return (
            <h3 className="pol-section__sub" key={i}>
              {block.sub}
            </h3>
          );
        }

        // A paragraph opening on a bold lead-in — "Fair dealing:",
        // "Immediate termination." — which is how these documents mark the
        // point a clause is making. Where `text` is empty the whole paragraph
        // was emphasised, and it renders as a standalone statement.
        if (block.lead) {
          return block.text ? (
            <p className="pol-section__p" key={i}>
              <strong className="pol-section__lead">{block.lead}</strong>{' '}
              <Linkify text={block.text} />
            </p>
          ) : (
            <p className="pol-section__p pol-section__p--strong" key={i}>
              <Linkify text={block.lead} />
            </p>
          );
        }

        if (block.table) {
          return <SectionTable key={i} table={block.table} />;
        }

        return (
          <ul className="pol-section__list" key={i}>
            {(block.list || []).map((li, j) => (
              <li key={j}>
                <Linkify text={li} />
              </li>
            ))}
          </ul>
        );
      })}
    </>
  );
}

// A table from the policy text — the cookie register, the retention schedule,
// the list of processors.
//
// Wrapped in its own scrolling box rather than allowed to widen the page: these
// run to three columns of prose and there is no width at which "Purpose" and
// "Where data is stored" both fit comfortably on a phone. A table that scrolls
// sideways inside the column is readable; a page that scrolls sideways is not.
function SectionTable({ table }) {
  const head = table.head || [];
  const rows = table.rows || [];
  return (
    <div className="pol-tablewrap" tabIndex={0} role="group">
      <table className="pol-table">
        {head.length > 0 && (
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                // The first cell names the row, so it is its header rather
                // than another value in it.
                <td key={j} data-label={head[j] || ''}>
                  <Linkify text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
