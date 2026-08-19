import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { templatesApi } from '../../../api';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import BackToTop from '../../../components/shared/BackToTop.jsx';
import { CATEGORIES, FORMATS, FORMAT_BY_VALUE, fileSize } from '../data.js';
import './TemplatesBrowser.css';

// B6.5 — the Templates library, browsed exactly as the Prompt Library is.
//
// Same slicer on the left, same URL-held filter state, same grouping in the
// results: Category then Use Case, with the format tagged on each document.
// The two pages are the same browse and should not need learning twice.

const ALL = 'all';

function FilterGroup({ heading, name, options, value, onChange }) {
  return (
    <div className="browse-filter">
      <h3 className="browse-filter__heading">{heading}</h3>
      <div className="browse-filter__options">
        {options.map((opt) => (
          <label key={opt.value} className="browse-radio">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span className="browse-radio__dot" aria-hidden="true" />
            <span className="browse-radio__label">{opt.label}</span>
            {opt.count !== undefined && <span className="browse-radio__count">{opt.count}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function TemplatesBrowser() {
  const { audience } = useAudience();
  const inView = useMountReveal();
  const topRef = useRef(null);

  const [params, setParams] = useSearchParams();
  const category = params.get('category') || ALL;
  const useCase = params.get('use') || ALL;
  const format = params.get('format') || ALL;

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await templatesApi.list();
        if (!alive) return;
        setTemplates(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  // Every count is measured against the other two filters, so the number beside
  // an option is what clicking it actually yields.
  const categoryOptions = useMemo(() => {
    const matches = (t) =>
      (useCase === ALL || t.useCase === useCase) && (format === ALL || t.format === format);
    return [
      { value: ALL, label: 'All categories', count: templates.filter(matches).length },
      ...CATEGORIES.map((c) => ({
        value: c.value,
        label: c.label,
        count: templates.filter((t) => t.category === c.value && matches(t)).length,
      })),
    ];
  }, [templates, useCase, format]);

  const useCaseOptions = useMemo(() => {
    const matches = (t) =>
      (category === ALL || t.category === category) && (format === ALL || t.format === format);
    const seen = [];
    for (const t of templates) {
      if (t.useCase && !seen.includes(t.useCase)) seen.push(t.useCase);
    }
    return [
      { value: ALL, label: 'All use cases', count: templates.filter(matches).length },
      ...seen
        .map((name) => ({
          value: name,
          label: name,
          count: templates.filter((t) => t.useCase === name && matches(t)).length,
        }))
        .filter((o) => o.count > 0 || o.value === useCase),
    ];
  }, [templates, category, format, useCase]);

  const formatOptions = useMemo(() => {
    const matches = (t) =>
      (category === ALL || t.category === category) && (useCase === ALL || t.useCase === useCase);
    return [
      { value: ALL, label: 'All formats', count: templates.filter(matches).length },
      ...FORMATS.map((f) => ({
        value: f.value,
        label: f.label,
        count: templates.filter((t) => t.format === f.value && matches(t)).length,
      })),
    ];
  }, [templates, category, useCase]);

  const groups = useMemo(() => {
    const visible = templates.filter(
      (t) =>
        (category === ALL || t.category === category) &&
        (useCase === ALL || t.useCase === useCase) &&
        (format === ALL || t.format === format),
    );

    return CATEGORIES.map((c) => {
      const mine = visible.filter((t) => t.category === c.value);
      const cases = [];
      for (const t of mine) {
        let group = cases.find((g) => g.name === t.useCase);
        if (!group) {
          group = { name: t.useCase, order: t.useCaseOrder ?? 0, items: [] };
          cases.push(group);
        }
        group.order = Math.min(group.order, t.useCaseOrder ?? 0);
        group.items.push(t);
      }
      cases.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      return { ...c, cases };
    }).filter((c) => c.cases.length > 0);
  }, [templates, category, useCase, format]);

  const total = groups.reduce((n, c) => n + c.cases.reduce((m, g) => m + g.items.length, 0), 0);
  const filtered = category !== ALL || useCase !== ALL || format !== ALL;

  return (
    <section
      ref={topRef}
      className={`browse browse tl${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <BackToTop targetRef={topRef} label="Back to the filters" />

      <div className="browse__inner">
        <div id="browse-filter-panel" className={`browse-filters-wrap${filtersOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="browse-filters__close"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
              strokeWidth="2" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>

          <aside className="browse-filters">
            <FilterGroup
              heading="Category"
              name="category"
              options={categoryOptions}
              value={category}
              onChange={(v) => setFilter('category', v)}
            />
            <FilterGroup
              heading="Use case"
              name="use"
              options={useCaseOptions}
              value={useCase}
              onChange={(v) => setFilter('use', v)}
            />
            <FilterGroup
              heading="Format"
              name="format"
              options={formatOptions}
              value={format}
              onChange={(v) => setFilter('format', v)}
            />

            {filtered && (
              <button
                type="button"
                className="browse-filters__reset"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Reset filters
              </button>
            )}
          </aside>
        </div>

        <div className="browse-main">
          <button
            type="button"
            className="browse-main__filter-button"
            aria-expanded={filtersOpen}
            aria-controls="browse-filter-panel"
            onClick={() => setFiltersOpen(true)}
          >
            Filter templates
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          {status === 'loading' && <p className="browse-main__note">Loading templates…</p>}
          {status === 'error' && (
            <p className="browse-main__note">
              We couldn&apos;t load the templates right now. Please try again shortly.
            </p>
          )}
          {status === 'ready' && templates.length === 0 && (
            <p className="browse-main__note">
              No templates have been published yet. Every document here is sourced and its
              licence checked before it goes up, so the library fills slowly on purpose.
            </p>
          )}
          {status === 'ready' && templates.length > 0 && total === 0 && (
            <p className="browse-main__note">No templates match those filters.</p>
          )}

          {groups.map((group) => (
            <section className="browse-group tl-cat" key={group.value}>
              <header className="tl-cat__head">
                <h2 className="tl-cat__title">{group.label}</h2>
                <p className="tl-cat__blurb">{group.blurb}</p>
              </header>

              {group.cases.map((useCaseGroup) => (
                <section className="tl-case" key={useCaseGroup.name}>
                  <h3 className="tl-case__title">{useCaseGroup.name}</h3>
                  <ul className="tl-cards">
                    {useCaseGroup.items.map((template) => (
                      <TemplateCard key={template._id || template.id} template={template} />
                    ))}
                  </ul>
                </section>
              ))}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

// One document. The download is a plain link to the API's own download route,
// which is what names the file, sets the media type and counts the tally — so
// it works on middle-click and "save link as" the way a download should, rather
// than depending on a click handler.
function TemplateCard({ template }) {
  const fmt = FORMAT_BY_VALUE[template.format];
  const size = fileSize(template.file?.size);
  const id = template._id || template.id;
  const licence = template.licence || {};

  return (
    <li className="tl-card">
      <div className="tl-card__main">
        <div className="tl-card__head">
          <h4 className="tl-card__title">{template.title}</h4>
          <span className={`tl-format tl-format--${template.format}`}>{fmt?.ext || ''}</span>
        </div>

        {template.description && <p className="tl-card__body">{template.description}</p>}

        {/* B6.6 — attribution where the licence requires it. Rendered on the
            card rather than tucked into a page footer, because the condition
            attaches to this document and travels with it. */}
        {licence.attributionRequired && licence.attributionText && (
          <p className="tl-card__attribution">
            <span className="tl-card__attribution-label">Attribution:</span>{' '}
            {licence.attributionText}
          </p>
        )}
      </div>

      <div className="tl-card__foot">
        <a
          className="tl-download"
          href={templatesApi.downloadUrl(id)}
          // The server sets Content-Disposition, so this is belt and braces for
          // the case where a browser would otherwise try to display the file.
          download
        >
          <span className="tl-download__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <polyline points="7 11 12 16 17 11" />
              <path d="M5 20h14" />
            </svg>
          </span>
          Download {fmt?.label}
        </a>

        {size && <span className="tl-card__size">{size}</span>}

        {/* The source, where there is one to name. Not a licence notice: that is
            the attribution line above, and only where it is required. */}
        {template.source && <span className="tl-card__source">Source: {template.source}</span>}
      </div>
    </li>
  );
}
