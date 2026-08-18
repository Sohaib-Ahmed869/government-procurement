// Filter bar for course lists: a segmented status control, a search box and a
// sort select. Kept generic (tabs are passed in) so the catalogue page can
// reuse it with its own segments.
export default function CatalogFilters({
  tabs = [],
  active,
  onTabChange,
  query,
  onQueryChange,
  sort,
  onSortChange,
  sortOptions = [],
  searchPlaceholder = 'Search courses…',
}) {
  return (
    <div className="lms-filters">
      <div className="lms-segmented" role="tablist" aria-label="Filter courses">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active === tab.value}
            className={`lms-segmented__btn${active === tab.value ? ' is-active' : ''}`}
            onClick={() => onTabChange(tab.value)}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className="lms-segmented__count">{tab.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="lms-filters__right">
        <div className="lms-search lms-search--inline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder.replace('…', '')}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        {sortOptions.length ? (
          <label className="lms-sort">
            <span className="lms-sr-only">Sort by</span>
            <select
              className="lms-select"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
