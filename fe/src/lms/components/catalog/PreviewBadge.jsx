import LmsIcon from '../LmsIcon.jsx';

// Marks a lesson that can be opened before purchase (L1).
export default function PreviewBadge({ label = 'Free preview' }) {
  return (
    <span className="lms-pill lms-pill--preview">
      <LmsIcon name="eye" />
      {label}
    </span>
  );
}
