// Generic table for admin list screens. Pass `columns` as
// [{ key, header, render?(row), width? }] and `rows`. Handles loading / error /
// empty states so every list screen looks and behaves consistently.
export default function DataTable({
  columns,
  rows,
  loading,
  error,
  emptyText = 'Nothing here yet.',
  rowKey = (r) => r._id || r.id,
}) {
  // A few shimmer rows while loading, so the layout doesn't jump.
  const skeletonRows = Array.from({ length: 6 });

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            skeletonRows.map((_, i) => (
              <tr key={`sk-${i}`} className="admin-table__skeleton-row" aria-hidden="true">
                {columns.map((c) => (
                  <td key={c.key}>
                    <span className="admin-skeleton" style={{ width: `${55 + ((i * 7 + c.key.length * 5) % 40)}%` }} />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && error && (
            <tr>
              {/* colSpan makes one cell span the whole row; the flex layout lives
                  on the inner div so the cell keeps its table-cell behaviour. */}
              <td colSpan={columns.length} className="admin-tablestate-cell">
                <div className="admin-tablestate admin-tablestate--error">
                  <span className="admin-tablestate__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16h.01" />
                    </svg>
                  </span>
                  <span className="admin-tablestate__title">{error}</span>
                  <span className="admin-tablestate__hint">Please try again in a moment.</span>
                </div>
              </td>
            </tr>
          )}

          {!loading && !error && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="admin-tablestate-cell">
                <div className="admin-tablestate">
                  <span className="admin-tablestate__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M3 9h18M8 14h8" />
                    </svg>
                  </span>
                  <span className="admin-tablestate__title">{emptyText}</span>
                </div>
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
