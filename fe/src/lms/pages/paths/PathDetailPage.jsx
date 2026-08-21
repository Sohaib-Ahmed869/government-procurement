import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import PathStepper from '../../components/paths/PathStepper.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import { usePath } from '../../hooks/usePrograms.js';

// One learning path (L4): the ordered courses, prerequisites resolved, and the
// certificate the program awards on completion. Served by /lms/programs/:slug,
// which also lets the author and staff see one before it is published so the
// builder's preview link works.
export default function PathDetailPage() {
  const { slug } = useParams();
  const { path, status, error } = usePath(slug);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="lms-card">
        <span className="lms-skel lms-skel--line" style={{ width: '48%', height: 22 }} />
        <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
      </div>
    );
  }

  if (status === 'error' || !path) {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Path not found</h1>
            <p className="lms-page__subtitle">
              {error ?? 'That learning path doesn’t exist.'}
            </p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/paths">
          All learning paths
        </Link>
      </div>
    );
  }

  const steps = path.steps ?? [];
  const accent = (path.accent ?? 0) % 6;
  const award = path.certificate?.heading || 'Certificate of Achievement';
  const next = steps.find((s) => s.state === 'current');

  return (
    <div className="lms-detail">
      <section className={`lms-detail__hero is-accent-${accent}`}>
        <div className="lms-detail__hero-body">
          <span className="lms-detail__path">
            <LmsIcon name="path" />
            Learning path
          </span>
          <h1 className="lms-detail__title">{path.title}</h1>
          {path.summary ? <p className="lms-detail__summary">{path.summary}</p> : null}
          <ul className="lms-detail__facts">
            <li><LmsIcon name="book" /> {steps.length} {steps.length === 1 ? 'course' : 'courses'}</li>
            <li><LmsIcon name="award" /> {award}</li>
            <li><LmsIcon name="chart" /> {path.percent ?? 0}% complete</li>
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
            {steps.length === 0 ? (
              <p className="lms-empty">This path has no courses in it yet.</p>
            ) : (
              <PathStepper steps={steps} />
            )}
          </section>

          {path.body ? (
            <section className="lms-card" style={{ marginTop: 18 }}>
              <div className="lms-card__head">
                <h2 className="lms-card__title">
                  <LmsIcon name="text" />
                  About this path
                </h2>
              </div>
              {/* Sanitised server-side on write, the same as a course body. */}
              <div className="lms-prose" dangerouslySetInnerHTML={{ __html: path.body }} />
            </section>
          ) : null}
        </div>

        <aside className="lms-detail__side">
          <div className="lms-card lms-detail__box">
            <h2 className="lms-card__title">Your progress</h2>
            <ProgressBar
              percent={path.percent ?? 0}
              complete={path.complete}
              left={
                <>
                  <strong>{path.doneCount ?? 0}</strong> of {steps.length} courses
                </>
              }
              right={<strong>{path.percent ?? 0}%</strong>}
            />

            <div className="lms-detail__cta">
              {path.complete ? (
                <Link className="lms-btn lms-btn--mint lms-btn--block" to="/learn/certificates">
                  <LmsIcon name="award" />
                  View certificate
                </Link>
              ) : next?.course ? (
                <>
                  <Link
                    className="lms-btn lms-btn--primary lms-btn--block"
                    to={`/learn/courses/${next.course.slug}`}
                  >
                    <LmsIcon name="play" />
                    Continue
                  </Link>
                  {/* The course name goes underneath rather than inside the
                      button. Course titles here run to 45 characters. */}
                  <p className="lms-detail__note">Next up: {next.course.title}</p>
                </>
              ) : null}
            </div>

            <p className="lms-detail__note">
              {path.complete
                ? `You've completed every course in this path.`
                : `Finish all ${steps.length} courses to earn the ${award}.`}
            </p>

            <ul className="lms-includes">
              {steps.map((s, i) => (
                <li key={s.id ?? i}>
                  <LmsIcon name={s.state === 'done' ? 'check' : s.state === 'locked' ? 'lock' : 'book'} />
                  <span>{s.course?.title ?? 'Course unavailable'}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
