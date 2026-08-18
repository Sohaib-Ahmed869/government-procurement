import { initialsOf } from '../../utils/names.js';

// Initials avatar (L6). Deliberately not an uploaded image: there is no avatar
// upload yet, and a broken <img> is worse than initials that always work.
// Swap the inner content when `mediaApi` gains a student-avatar route.
export default function StudentAvatar({ name, size = 'md' }) {
  return (
    <span className={`lms-savatar lms-savatar--${size}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
