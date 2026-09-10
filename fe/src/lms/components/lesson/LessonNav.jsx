import { useCallback, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { isLocked } from '../../utils/gating.js';
import { lessonHref } from '../../utils/lessonHref.js';


// Previous | position | next, at the foot of every lesson.
//
// There is no "Mark as complete" here any more. Completion is not something the
// learner should have to declare — it is what finishing the lesson MEANS, so it
// happens when they finish it: pressing Next records the lesson on the way out,
// and a video that plays to its end records itself. The button was asking
// people to file a report on something the page could already see, and a
// course's progress was only ever as honest as how diligently they filed it.
//
// `canAdvance` is how a screen holds the way forward until the lesson has
// actually been got through — the text read to the bottom, say. `blockedHint`
// says why it is held, because a Next that is simply dead is indistinguishable
// from one that is broken.
//
// The last lesson has no Next, and used to end with nothing on the right at
// all: the tick was the only way to finish a course, so removing it would have
// left the final lesson — and the certificate behind it — unreachable. It gets
// Finish instead, which records the lesson and then goes STRAIGHT TO THE
// CERTIFICATE. Finishing the last lesson is what issues it, and the server says
// so in the same response, so there is no reason to drop the learner back on the
// course overview to hunt for the thing they have just earned.
//
// Unlike Next, Finish is a button rather than a link: it has to wait for the
// completion to come back before it knows where it is going.
export default function LessonNav({
  slug,
  prev,
  next,
  index,
  total,
  // Called on the way out, so leaving the lesson forwards records it as done.
  // Fire-and-forget: the navigation must not wait on a progress write, and
  // marking a lesson that is already marked is a no-op.
  onAdvance,
  canAdvance = true,
  blockedHint = 'Get to the end of this lesson to continue',
}) {
  const navigate = useNavigate();
  // The certificate this learner already holds for the course, if they have
  // been here before. A second pass over the last lesson completes nothing, so
  // the response carries no certificate and this is the only way to know where
  // to send them.
  const { enrolment } = useOutletContext() ?? {};
  const [finishing, setFinishing] = useState(false);

  const nextLocked = next ? isLocked(next.gate) : false;
  const position = Number.isInteger(index) && total ? `${index + 1} of ${total}` : null;

  const courseHref = `/learn/courses/${slug}`;

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);

    let certId = enrolment?.certificate?.id ?? null;
    try {
      const result = await onAdvance?.();
      // `certificate` is the freshly issued document; `_id` on the way out of
      // Mongo, `id` if anything has already normalised it.
      const issued = result?.certificate;
      if (result?.courseComplete && issued) certId = issued._id ?? issued.id ?? certId;
    } catch {
      // Failing to record the completion must not strand them on the lesson.
      // They land on the course, which will show what did and didn't save.
    }

    navigate(certId ? `/learn/certificates/${certId}` : courseHref);
  }, [finishing, enrolment, onAdvance, navigate, courseHref]);

  return (
    <div className="lms-lessonnav">
      <div className="lms-lessonnav__side">
        {prev ? (
          <Link className="lms-btn" to={lessonHref(slug, prev)}>
            <LmsIcon name="chevron" className="lms-lessonnav__prev-icon" />
            Previous
          </Link>
        ) : null}
      </div>

      <div className="lms-lessonnav__mid">
        {position ? <span className="lms-lessonnav__count">{position}</span> : null}
      </div>

      <div className="lms-lessonnav__side lms-lessonnav__side--end">
        {nextLocked ? (
          <button type="button" className="lms-btn" disabled title="This lesson isn't available yet">
            <LmsIcon name="lock" />
            Next
          </button>
        ) : !canAdvance ? (
          <button type="button" className="lms-btn" disabled title={blockedHint}>
            {next ? 'Next' : 'Finish'}
            <LmsIcon name={next ? 'arrow' : 'check'} />
          </button>
        ) : next ? (
          <Link
            className="lms-btn lms-btn--primary"
            to={lessonHref(slug, next)}
            onClick={() => onAdvance?.()}
          >
            Next
            <LmsIcon name="arrow" />
          </Link>
        ) : (
          <button
            type="button"
            className="lms-btn lms-btn--primary"
            onClick={finish}
            disabled={finishing}
          >
            {finishing ? 'Finishing…' : 'Finish'}
            <LmsIcon name="check" />
          </button>
        )}
      </div>
    </div>
  );
}
