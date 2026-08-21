import LmsIcon from '../LmsIcon.jsx';
import EnrollButton from '../catalog/EnrollButton.jsx';

/* ---------------------------------------------------------------------------
   The end of a free preview (LMS 9.0b).

   A preview is a sample, and a sample that does not say what it is a sample OF
   is just a free lesson. This is the sentence that turns one into the other:
   what was just watched, what the rest of the course holds, and the one button
   that gets it.

   Shown to anyone WITHOUT an active enrolment — signed out or signed in, they
   are in the same position and get the same offer. It renders nothing for a
   learner who already has the course, because they are not being sold anything,
   and nothing on a lesson the instructor did not flag as a preview, because
   that lesson never reached the screen without an enrolment anyway.
   ------------------------------------------------------------------------ */
export default function PreviewGate({ course, lesson, enrolled }) {
  if (enrolled || !lesson?.preview || !course) return null;

  const price = course.price
    ? new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: course.currency || 'AUD',
        maximumFractionDigits: 0,
      }).format(course.price)
    : null;

  return (
    <aside className="lms-previewgate">
      <div className="lms-previewgate__mark" aria-hidden="true">
        <LmsIcon name="eye" />
      </div>

      <div className="lms-previewgate__body">
        <p className="lms-previewgate__kicker">That was a free preview</p>
        <h2 className="lms-previewgate__title">{course.title}</h2>
        {course.summary ? (
          <p className="lms-previewgate__text">{course.summary}</p>
        ) : null}

        <ul className="lms-previewgate__list">
          <li>
            <LmsIcon name="lessons" />
            Every lesson in the course, not just this one
          </li>
          <li>
            <LmsIcon name="doc" />
            The downloads and worked examples attached to each
          </li>
          <li>
            <LmsIcon name="award" />
            A certificate when you finish
          </li>
        </ul>
      </div>

      <div className="lms-previewgate__act">
        {/* Price above the button rather than inside it: the button already says
            what it does, and a course that is free should not be shouting a
            price of nothing. */}
        {price ? <p className="lms-previewgate__price">{price}</p> : null}
        {/* EnrollButton owns all four cases — signed out, free, paid, already
            in — so the preview does not grow its own second opinion on how
            somebody gets a course. `enrolled` is forced false: we only render
            here when they are not, and the outline's course object carries no
            such flag of its own. */}
        <EnrollButton course={{ ...course, enrolled: false }} block />
      </div>
    </aside>
  );
}
