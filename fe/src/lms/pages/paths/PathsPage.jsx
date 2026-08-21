import PathCard from '../../components/paths/PathCard.jsx';
import { usePaths } from '../../hooks/usePrograms.js';

// Learning paths (L4): programs of courses in a required order, each ending in
// its own certificate.
//
// Reads /lms/programs, which is every path an admin has approved. It used to
// read hooks/usePaths.js — a placeholder over three hardcoded paths — so a real
// path an instructor built and an admin published never appeared here at all.
export default function PathsPage() {
  const { paths, status, reload } = usePaths();

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Learning Paths</h1>
          <p className="lms-page__subtitle">
            Structured programs that take you through several courses in order, with a
            certificate at the end.
          </p>
        </div>
      </div>

      <div className="lms-course-grid">
        {status === 'loading' ? (
          Array.from({ length: 3 }, (_, i) => (
            <div className="lms-course lms-course--skeleton" key={i} aria-hidden="true">
              <div className="lms-course__cover" />
              <div className="lms-course__body">
                <span className="lms-skel lms-skel--line" style={{ width: '70%' }} />
                <span className="lms-skel lms-skel--line" style={{ width: '48%' }} />
                <span className="lms-skel lms-skel--bar" />
              </div>
            </div>
          ))
        ) : status === 'error' ? (
          <div className="lms-card lms-course-grid__empty">
            <p className="lms-empty">
              Couldn’t load the learning paths.{' '}
              <button type="button" className="lms-linkbtn" onClick={reload}>Try again</button>
            </p>
          </div>
        ) : paths.length === 0 ? (
          <div className="lms-card lms-course-grid__empty">
            <p className="lms-empty">No learning paths are published yet.</p>
          </div>
        ) : (
          paths.map((path) => <PathCard key={path._id ?? path.slug} path={path} />)
        )}
      </div>
    </div>
  );
}
