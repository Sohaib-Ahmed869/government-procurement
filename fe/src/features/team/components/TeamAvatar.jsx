// Circular portrait shared by the team grid and the member detail hero. With a
// photo on the record it shows the photo; without one it falls back to the
// person's initials, so the layout is identical either way.
export default function TeamAvatar({ member, className = '' }) {
  // The CMS stores the photo as { key, url }; an unset one is an empty string.
  const photo = member.photo?.url || '';

  const initials = member.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <span
      className={`team-avatar${photo ? ' team-avatar--photo' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      {photo ? (
        <img className="team-avatar__img" src={photo} alt="" />
      ) : (
        <span className="team-avatar__initials">{initials}</span>
      )}
    </span>
  );
}
