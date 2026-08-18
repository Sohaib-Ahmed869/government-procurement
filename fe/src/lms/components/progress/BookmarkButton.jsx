import LmsIcon from '../LmsIcon.jsx';
import { toggleBookmark, useIsBookmarked } from '../../hooks/useBookmarks.js';

// Bookmark toggle for a lesson (L3). Reads its own state from the store rather
// than taking it as a prop, so it stays correct if the same lesson is
// bookmarked from somewhere else on the page.
//
// `at` pins the bookmark to a moment. The video player passes the current
// playhead so a learner can mark a point, not just the lesson.
export default function BookmarkButton({ slug, lessonId, at = null, size = 'sm' }) {
  const on = useIsBookmarked(slug, lessonId);

  return (
    <button
      type="button"
      className={`lms-btn${size === 'sm' ? ' lms-btn--sm' : ''}${on ? ' lms-btn--mint' : ''}`}
      onClick={() => toggleBookmark({ slug, lessonId, at })}
      aria-pressed={on}
      title={on ? 'Remove bookmark' : 'Bookmark this lesson'}
    >
      <LmsIcon name="bookmark" />
      {on ? 'Bookmarked' : 'Bookmark'}
    </button>
  );
}
