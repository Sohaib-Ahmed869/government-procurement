import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import ProgressBar from '../progress/ProgressBar.jsx';

const STATE_LABEL = {
  done: 'Complete',
  current: 'Up next',
  open: 'Available',
  locked: 'Locked',
};

// The ordered courses in a path, with prerequisites resolved (L4). Every state
// on this list was decided by the server; the stepper only draws it, so the
// rail cannot disagree with what the certificate rule believes.
export default function PathStepper({ steps }) {
  return (
    <ol className="lms-stepper">
      {steps.map((step, i) => {
        const course = step.course;
        // A step whose course has been deleted still has to render, or the
        // whole path throws on one missing join.
        if (!course) {
          return (
            <li key={step.id ?? i} className="lms-step is-locked">
              <span className="lms-step__marker" aria-hidden="true">{i + 1}</span>
              <div className="lms-step__body">
                <h3 className="lms-step__title">Course unavailable</h3>
                <p className="lms-step__meta">This course is no longer in the catalogue.</p>
              </div>
            </li>
          );
        }

        return (
          <li key={step.id ?? course.slug} className={`lms-step is-${step.state}`}>
            <span className="lms-step__marker" aria-hidden="true">
              {step.state === 'done' ? (
                <LmsIcon name="check" />
              ) : step.state === 'locked' ? (
                <LmsIcon name="lock" />
              ) : (
                i + 1
              )}
            </span>

            <div className="lms-step__body">
              <div className="lms-step__head">
                <h3 className="lms-step__title">
                  {step.state === 'locked' ? (
                    course.title
                  ) : (
                    <Link to={`/learn/courses/${course.slug}`}>{course.title}</Link>
                  )}
                </h3>
                <span className={`lms-pill lms-step__pill is-${step.state}`}>
                  {STATE_LABEL[step.state]}
                </span>
              </div>

              <p className="lms-step__meta">
                {step.lessonsTotal} {step.lessonsTotal === 1 ? 'lesson' : 'lessons'}
                {course.level ? ` · ${course.level}` : ''}
                {step.required ? '' : ' · elective'}
              </p>

              {step.state === 'locked' ? (
                <p className="lms-step__locked">
                  <LmsIcon name="lock" />
                  Complete {step.unmet.join(' and ')} first
                </p>
              ) : step.enrolled ? (
                <div className="lms-step__progress">
                  <ProgressBar
                    percent={step.percent}
                    complete={step.state === 'done'}
                    left={
                      <>
                        <strong>{step.lessonsDone}</strong> of {step.lessonsTotal} lessons
                      </>
                    }
                    right={<strong>{step.percent}%</strong>}
                  />
                </div>
              ) : (
                <p className="lms-step__meta">Not enrolled yet.</p>
              )}

              {step.state !== 'locked' && step.state !== 'done' ? (
                <Link
                  className={`lms-btn lms-btn--sm${step.state === 'current' ? ' lms-btn--primary' : ''}`}
                  to={`/learn/courses/${course.slug}`}
                >
                  <LmsIcon name="play" />
                  {step.enrolled ? 'Continue' : 'Start course'}
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
