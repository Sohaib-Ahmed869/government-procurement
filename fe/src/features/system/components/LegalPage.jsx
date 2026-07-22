import Breadcrumbs from '../../../components/seo/Breadcrumbs.jsx';
import './LegalPage.css';

// Shared long-form template for the legal / policy pages (Privacy Policy,
// Terms of Use). Content is passed as an array of { heading, body } sections
// where body is an array of paragraph strings or { list: [...] }. Real copy is
// managed in the CMS Pages editor later; these hold the placeholder text.
export default function LegalPage({ title, updated, intro, sections = [], crumbs = [] }) {
  return (
    <article className="legal">
      <div className="legal__inner">
        {crumbs.length > 0 && <Breadcrumbs items={crumbs} />}

        <header className="legal__head">
          <h1 className="legal__title">{title}</h1>
          {updated && <p className="legal__updated">Last updated: {updated}</p>}
          {intro && <p className="legal__intro">{intro}</p>}
        </header>

        <div className="legal__body">
          {sections.map((section, i) => (
            <section className="legal__section" key={section.heading || i}>
              {section.heading && <h2 className="legal__heading">{section.heading}</h2>}
              {section.body.map((block, j) =>
                typeof block === 'string' ? (
                  <p className="legal__p" key={j}>
                    {block}
                  </p>
                ) : (
                  <ul className="legal__list" key={j}>
                    {block.list.map((li, k) => (
                      <li key={k}>{li}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
