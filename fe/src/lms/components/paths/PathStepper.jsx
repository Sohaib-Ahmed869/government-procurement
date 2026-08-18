import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import ProgressBar from '../progress/ProgressBar.jsx';

const STATE_LABEL = {
  done: 'Complete',
  current: 'Up next',
  open: 'Available',
  locked: 'Locked',
};

// The ordered courses in a path, with prerequisites resolved (L4). The
// connecting rail fills as far as the learner has got, so where they are in the
// program is readable at a glance rather than counted.
export default function PathStepper({ steps }) {
  return (
    <ol className="lms-stepper">
      {steps.map((step, i) => (
        <li key={step.slug} className={`lms-step is-${step.state}`}>
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
                  step.course.title
                ) : (
                  <Link to={`/learn/courses/${step.slug}`}>{step.course.title}</Link>
                )}
              </h3>
              <span className={`lms-pill lms-step__pill is-${step.state}`}>
                {STATE_LABEL[step.state]}
              </span>
            </div>

            <p className="lms-step__meta">
              {step.course.modules} modules · {step.course.lessons} lessons ·{' '}
              {step.course.durationLabel}
            </p>

            {step.state === 'locked' ? (
              <p className="lms-step__locked">
                <LmsIcon name="lock" />
                Complete {step.unmet.join(' and ')} first
              </p>
            ) : step.enrolment ? (
              <div className="lms-step__progress">
                <ProgressBar
                  percent={step.percent}
                  complete={step.state === 'done'}
                  left={
                    <>
                      <strong>{step.enrolment.lessonsDone}</strong> of {step.course.lessons} lessons
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
                to={`/learn/courses/${step.slug}`}
              >
                <LmsIcon name="play" />
                {step.enrolment ? 'Continue' : 'Start course'}
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
