import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { removeBookmark } from '../../hooks/useBookmarks.js';
import { lessonHref } from '../../utils/lessonHref.js';
import { formatTime } from '../../utils/transcript.js';

export default function BookmarkList({ bookmarks }) {
  return (
    <ul className="lms-bookmarks">
      {bookmarks.map((b) => {
        const href = lessonHref(b.slug, { id: b.lessonId, kind: b.lessonKind });
        return (
          <li key={b.id} className="lms-bookmark">
            <Link className="lms-bookmark__main" to={b.at != null ? `${href}#t=${Math.floor(b.at)}` : href}>
              <span className="lms-list__icon">
                <LmsIcon name={b.lessonKind} />
              </span>
              <span className="lms-bookmark__body">
                <span className="lms-bookmark__title">{b.lessonTitle}</span>
                <span className="lms-bookmark__meta">
                  {b.moduleTitle} · {b.minutes}m
                </span>
              </span>
            </Link>

            {b.at != null ? (
              <span className="lms-pill lms-bookmark__stamp">
                <LmsIcon name="clock" />
                {formatTime(b.at)}
              </span>
            ) : null}

            <button
              type="button"
              className="lms-btn lms-btn--sm lms-btn--ghost"
              onClick={() => removeBookmark(b.id)}
              title="Remove bookmark"
              aria-label={`Remove bookmark on ${b.lessonTitle}`}
            >
              <LmsIcon name="bookmark" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
