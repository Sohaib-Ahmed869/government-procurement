import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import ProgressBar from '../progress/ProgressBar.jsx';

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function when(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Where the learner is, as one word. Revoked is checked first: access that has
// been taken back is the fact that matters, whatever their progress was.
function standing(s) {
  if (s.revokedAt) return { label: 'Revoked', tone: 'due' };
  if (s.completedAt) return { label: 'Completed', tone: 'done' };
  if (s.lessonsDone > 0) return { label: 'In progress', tone: '' };
  return { label: 'Not started', tone: '' };
}

// How someone got in. Worth showing: a free enrolment, a purchase and one an
// admin granted are three different relationships to the course.
const SOURCE = {
  purchase: 'Purchased',
  free: 'Free',
  admin: 'Granted',
  organisation: 'Organisation',
};

// One course's roster (R1). Everything shown is derived on the server from the
// same Progress record the learner's own screens read, so an instructor and a
// student are never looking at two different numbers for the same course.
export default function RosterTable({ students, lessonCount }) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.user.name?.toLowerCase().includes(q) || s.user.email?.toLowerCase().includes(q),
    );
  }, [students, query]);

  if (!students.length) {
    return (
      <div className="lms-blank">
        <LmsIcon name="users" className="lms-blank__icon" />
        <h2>Nobody is enrolled yet</h2>
        <p>
          Once this course is published and someone enrols, they’ll appear here with how
          far through they are.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="lms-dtable__tools">
        <label className="lms-field lms-dtable__search">
          <span className="lms-sr-only">Search learners</span>
          <input
            className="lms-input"
            value={query}
            placeholder="Search by name or email"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="lms-dtable__count">
          {rows.length === students.length
            ? `${students.length} enrolled`
            : `${rows.length} of ${students.length}`}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="lms-empty">Nobody here matches “{query}”.</p>
      ) : (
        <div className="lms-dtable__scroll">
          <table className="lms-dtable">
            <thead>
              <tr>
                <th scope="col">Learner</th>
                <th scope="col">Enrolled</th>
                <th scope="col">Progress</th>
                <th scope="col">Last active</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const state = standing(s);
                return (
                  <tr key={s._id} className={s.revokedAt ? 'is-revoked' : undefined}>
                    <td>
                      <span className="lms-roster__who">
                        <span className="lms-avatar" aria-hidden="true">
                          {initials(s.user.name)}
                        </span>
                        <span className="lms-roster__id">
                          <span className="lms-roster__name">{s.user.name}</span>
                          <span className="lms-roster__email">{s.user.email}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="lms-roster__date">{when(s.enrolledAt)}</span>
                      <span className="lms-roster__sub">{SOURCE[s.source] ?? s.source}</span>
                    </td>
                    <td>
                      <span className="lms-roster__prog">
                        <ProgressBar percent={s.percent} complete={s.percent === 100} />
                        <span className="lms-roster__pct">
                          {s.percent}%
                          <span className="lms-roster__sub">
                            {s.lessonsDone}/{lessonCount || s.lessonsTotal} lessons
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="lms-roster__date">{when(s.lastAccessedAt)}</span>
                    </td>
                    <td>
                      <span className={`lms-pill${state.tone ? ` lms-pill--${state.tone}` : ''}`}>
                        {state.label}
                      </span>
                      {/* The certificate is the proof the course produced, so
                          it belongs beside the row that earned it. */}
                      {s.certificate ? (
                        <Link
                          className="lms-roster__cert"
                          to={`/learn/certificates/${s.certificate._id}`}
                          title={`Credential ${s.certificate.credentialId}`}
                        >
                          <LmsIcon name="award" />
                          {s.certificate.credentialId}
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
