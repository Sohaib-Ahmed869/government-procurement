import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import NoteList from '../../components/progress/NoteList.jsx';
import { useNotes } from '../../hooks/useNotes.js';

// Every note the learner has taken (L3), grouped by course. Grouping rather
// than one flat list because notes are almost always re-read in the context of
// the course they belong to.
export default function NotesPage() {
  const notes = useNotes();
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('all');

  const courses = useMemo(() => {
    const seen = new Map();
    notes.forEach((n) => seen.set(n.slug, n.courseTitle));
    return [...seen].map(([slug, title]) => ({ slug, title }));
  }, [notes]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = notes.filter((n) => {
      if (course !== 'all' && n.slug !== course) return false;
      if (!q) return true;
      return (
        n.text.toLowerCase().includes(q) ||
        n.lessonTitle.toLowerCase().includes(q) ||
        n.courseTitle.toLowerCase().includes(q)
      );
    });

    const map = new Map();
    filtered.forEach((n) => {
      if (!map.has(n.slug)) map.set(n.slug, { slug: n.slug, title: n.courseTitle, notes: [] });
      map.get(n.slug).notes.push(n);
    });
    return [...map.values()];
  }, [notes, query, course]);

  const shown = groups.reduce((sum, g) => sum + g.notes.length, 0);

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Notes</h1>
          <p className="lms-page__subtitle">
            {notes.length
              ? `${notes.length} note${notes.length === 1 ? '' : 's'} across ${courses.length} course${courses.length === 1 ? '' : 's'}.`
              : 'Notes you take inside a lesson collect here.'}
          </p>
        </div>
      </div>

      {notes.length ? (
        <div className="lms-filters">
          <div className="lms-search lms-search--inline">
            <LmsIcon name="search" />
            <input
              type="search"
              value={query}
              placeholder="Search your notes…"
              aria-label="Search your notes"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="lms-filters__right">
            <label className="lms-sort">
              <span className="lms-sr-only">Filter by course</span>
              <select className="lms-select" value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="all">All courses</option>
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.title}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {notes.length === 0 ? (
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="note" className="lms-blank__icon" />
            <h2>No notes yet</h2>
            <p>
              Open any lesson and use the <strong>My notes</strong> tab. In a video lesson your
              note is stamped with the moment you were at, so you can jump straight back to it.
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/my-courses">
              Go to my courses
            </Link>
          </div>
        </div>
      ) : shown === 0 ? (
        <div className="lms-card">
          <p className="lms-empty">No notes match those filters.</p>
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
            <NoteList notes={group.notes} />
          </section>
        ))
      )}
    </div>
  );
}
