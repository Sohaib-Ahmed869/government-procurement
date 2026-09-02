import Select from '../Select.jsx';

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

        {/* The <label> and its screen-reader span went with the native
            element: a <label> associates with a form control, and this is a
            button, so it named nothing. The name is on the control now. */}
        {sortOptions.length ? (
          <Select
            className="lms-sort"
            aria-label="Sort by"
            value={sort}
            onChange={onSortChange}
            options={sortOptions}
          />
        ) : null}
      </div>
    </div>
  );
}
