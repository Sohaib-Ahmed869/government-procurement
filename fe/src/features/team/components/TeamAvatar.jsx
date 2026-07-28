// Circular portrait shared by the team grid and the member detail hero. With a
// photo on the record it shows the photo; without one it falls back to the
// person's initials, so the layout is identical either way.
export default function TeamAvatar({ member, className = '' }) {
  const initials = member.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <span
      className={`team-avatar${member.photo ? ' team-avatar--photo' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      {member.photo ? (
        <img className="team-avatar__img" src={member.photo} alt="" />
      ) : (
        <span className="team-avatar__initials">{initials}</span>
      )}
    </span>
  );
}
