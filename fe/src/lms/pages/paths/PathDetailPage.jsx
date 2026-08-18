import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import PathStepper from '../../components/paths/PathStepper.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import { usePath } from '../../hooks/usePaths.js';

// One learning path (L4): the ordered courses, prerequisites resolved, and the
// certificate the program awards on completion.
export default function PathDetailPage() {
  const { slug } = useParams();
  const { path, status } = usePath(slug);

  if (status === 'loading') {
    return (
      <div className="lms-card">
        <span className="lms-skel lms-skel--line" style={{ width: '48%', height: 22 }} />
        <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Path not found</h1>
            <p className="lms-page__subtitle">That learning path doesn’t exist.</p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/paths">
          All learning paths
        </Link>
      </div>
    );
  }

  return (
    <div className="lms-detail">
      <section className={`lms-detail__hero is-accent-${path.accent % 6}`}>
        <div className="lms-detail__hero-body">
          <span className="lms-detail__path">
            <LmsIcon name="path" />
            Learning path
          </span>
          <h1 className="lms-detail__title">{path.title}</h1>
          <p className="lms-detail__summary">{path.summary}</p>
          <ul className="lms-detail__facts">
            <li><LmsIcon name="book" /> {path.steps.length} courses</li>
            <li><LmsIcon name="award" /> {path.certificateTitle}</li>
            <li><LmsIcon name="chart" /> {path.percent}% complete</li>
          </ul>
        </div>
      </section>

      <div className="lms-detail__cols">
        <div className="lms-detail__main">
          <section className="lms-card">
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="path" />
                Program
              </h2>
              <span className="lms-card__note">
                Courses unlock as their prerequisites are met
              </span>
            </div>
            <PathStepper steps={path.steps} />
          </section>
        </div>

        <aside className="lms-detail__side">
          <div className="lms-card lms-detail__box">
            <h2 className="lms-card__title">Your progress</h2>
            <ProgressBar
              percent={path.percent}
              complete={path.complete}
              left={
                <>
                  <strong>{path.doneCount}</strong> of {path.steps.length} courses
                </>
              }
              right={<strong>{path.percent}%</strong>}
            />

            <div className="lms-detail__cta">
              {path.complete ? (
                <Link className="lms-btn lms-btn--mint lms-btn--block" to="/learn/certificates">
                  <LmsIcon name="award" />
                  View certificate
                </Link>
              ) : (
                (() => {
                  const next = path.steps.find((s) => s.state === 'current');
                  return next ? (
                    <>
                      <Link
                        className="lms-btn lms-btn--primary lms-btn--block"
                        to={`/learn/courses/${next.slug}`}
                      >
                        <LmsIcon name="play" />
                        Continue
                      </Link>
                      {/* The course name goes underneath rather than inside the
                          button. Course titles here run to 45 characters. */}
                      <p className="lms-detail__note">Next up: {next.course.title}</p>
                    </>
                  ) : null;
                })()
              )}
            </div>

            <p className="lms-detail__note">
              {path.complete
                ? `You've completed every course in this path.`
                : `Finish all ${path.steps.length} courses to earn the ${path.certificateTitle} certificate.`}
            </p>

            <ul className="lms-includes">
              {path.steps.map((s) => (
                <li key={s.slug}>
                  <LmsIcon name={s.state === 'done' ? 'check' : s.state === 'locked' ? 'lock' : 'book'} />
                  <span>{s.course.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
