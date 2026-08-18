import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import { videoApi } from '../../../api/lms.js';
import { sizeLabel } from '../../utils/s3Upload.js';

// The icon each kind gets. Matches the instructor's list, so a handout looks
// the same on both sides of the course.
const ICON = {
  pdf: 'pdf',
  sheet: 'doc',
  slides: 'doc',
  zip: 'doc',
  image: 'media',
  link: 'link',
  video: 'video',
  doc: 'doc',
};

// Downloadable resources attached to a lesson (L1). Gated: the list is visible
// to anyone browsing, but an uploaded file is fetched through a short-lived
// signed URL the server only issues to an enrolled learner. A non-enrolled
// visitor sees the titles and a lock rather than a working link.
//
// The signed URL is requested when the learner clicks, not on render: it lasts
// minutes, and one issued when the page loaded has usually lapsed by the time
// anyone reaches for it.
export default function ResourceList({
  resources,
  enrolled,
  // The course page shows this same list for the course's own materials, where
  // "attached to this lesson" would be the wrong thing to say.
  emptyLabel = 'No downloads attached to this lesson.',
}) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  if (!resources.length) {
    return <p className="lms-empty">{emptyLabel}</p>;
  }

  const open = async (r) => {
    setError('');
    setBusyId(r.id);
    try {
      const { url } = await videoApi.resourceUrl(r.lessonId, r.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err?.message ?? 'Could not open that download.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <ul className="lms-resources">
        {resources.map((r) => {
          const locked = r.signed && !enrolled;
          return (
            <li key={r.id} className={`lms-resource${locked ? ' is-locked' : ''}`}>
              <span className="lms-resource__icon">
                <LmsIcon name={ICON[r.kind] ?? 'doc'} />
              </span>
              <span className="lms-resource__body">
                <span className="lms-resource__title">{r.title}</span>
                <span className="lms-resource__meta">
                  {(r.kind ?? 'file').toUpperCase()}
                  {r.sizeBytes ? ` · ${sizeLabel(r.sizeBytes)}` : ''}
                </span>
              </span>

              {locked ? (
                <LmsIcon name="lock" className="lms-resource__lock" />
              ) : r.signed ? (
                <button
                  type="button"
                  className="lms-btn lms-btn--sm lms-btn--ghost"
                  onClick={() => open(r)}
                  disabled={busyId === r.id}
                  title={`Download ${r.title}`}
                  aria-label={`Download ${r.title}`}
                >
                  <LmsIcon name="download" />
                </button>
              ) : (
                <a
                  className="lms-btn lms-btn--sm lms-btn--ghost"
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${r.title}`}
                  aria-label={`Open ${r.title}`}
                >
                  <LmsIcon name="link" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {error ? <p className="lms-field__error">{error}</p> : null}
    </>
  );
}
