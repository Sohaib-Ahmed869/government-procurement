import BadgeChip from './BadgeChip.jsx';

export default function BadgeGrid({ badges, emptyText }) {
  if (!badges.length) {
    return <p className="lms-empty">{emptyText}</p>;
  }
  return (
    <div className="lms-badge-grid">
      {badges.map((b) => (
        <BadgeChip key={b.id} badge={b} />
      ))}
    </div>
  );
}
