import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import BookmarkList from '../../components/progress/BookmarkList.jsx';
import { useBookmarks } from '../../hooks/useBookmarks.js';

// Saved lessons and moments (L3), grouped by course.
export default function BookmarksPage() {
  const bookmarks = useBookmarks();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = bookmarks.filter(
      (b) =>
        !q ||
        b.lessonTitle.toLowerCase().includes(q) ||
        b.courseTitle.toLowerCase().includes(q) ||
        b.moduleTitle.toLowerCase().includes(q),
    );

    const map = new Map();
    filtered.forEach((b) => {
      if (!map.has(b.slug)) map.set(b.slug, { slug: b.slug, title: b.courseTitle, items: [] });
      map.get(b.slug).items.push(b);
    });
    return [...map.values()];
  }, [bookmarks, query]);

  const shown = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Bookmarks</h1>
          <p className="lms-page__subtitle">
            {bookmarks.length
              ? `${bookmarks.length} saved lesson${bookmarks.length === 1 ? '' : 's'}.`
              : 'Lessons and moments you save collect here.'}
          </p>
        </div>
      </div>

      {bookmarks.length ? (
        <div className="lms-filters">
          <div className="lms-search lms-search--inline">
            <LmsIcon name="search" />
            <input
              type="search"
              value={query}
              placeholder="Search bookmarks…"
              aria-label="Search bookmarks"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {bookmarks.length === 0 ? (
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="bookmark" className="lms-blank__icon" />
            <h2>Nothing bookmarked yet</h2>
            <p>
              Use the <strong>Bookmark</strong> button in any lesson. In a video, it saves the
              point you were at so you can return to exactly that moment.
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/my-courses">
              Go to my courses
            </Link>
          </div>
        </div>
      ) : shown === 0 ? (
        <div className="lms-card">
          <p className="lms-empty">No bookmarks match “{query.trim()}”.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section className="lms-card lms-notegroup" key={group.slug}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="book" />
                {group.title}
              </h2>
              <Link className="lms-btn lms-btn--sm lms-btn--ghost" to={`/learn/courses/${group.slug}`}>
                Open course
              </Link>
            </div>
            <BookmarkList bookmarks={group.items} />
          </section>
        ))
      )}
    </div>
  );
}
