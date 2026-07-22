// Small coloured pill for a status/state value. The CSS maps known statuses
// (published, draft, pending, rejected, …) to green/amber/red automatically.
export default function StatusBadge({ status }) {
  if (!status) return null;
  const key = String(status).toLowerCase().replace(/\s+/g, '_');
  const label = String(status).replace(/_/g, ' ');
  return <span className={`admin-badge admin-badge--${key}`}>{label}</span>;
}
