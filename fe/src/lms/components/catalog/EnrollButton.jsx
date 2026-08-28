import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { enrollmentsApi } from '../../../api/lms.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';

// The primary action on a course (L6 / C1). Four cases:
//   not signed in    -> sign in first, then come back here
//   already enrolled -> continue where they left off
//   free course      -> enrol, then open the course
//   paid course      -> into checkout
//
// The free path posts to /lms/enrollments. A PAID course is deliberately not
// enrollable from here: the server refuses it, and that enrolment is created by
// the payment webhook. Asking the client to grant it would be asking the client
// to grant itself a paid course.
export default function EnrollButton({ course, size = 'md', block = false, onEnrolled }) {
  const { isAuthenticated } = useStudentAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cls = `lms-btn lms-btn--primary${size === 'sm' ? ' lms-btn--sm' : ''}${
    block ? ' lms-btn--block' : ''
  }`;

  // `enrolled` is a property of a person, not of a course. A visitor is not
  // enrolled in anything, whatever the record says.
  if (course.enrolled && isAuthenticated) {
    return (
      <Link className={cls} to={`/learn/courses/${course.slug}`}>
        <LmsIcon name="play" />
        Continue
      </Link>
    );
  }

  /* A course can be published — sales page readable, previews playing — while
     not taking enrolments. Both the enrol and the order endpoints refuse a
     course that is not `open`, so offering the button would only produce an
     error the reader can do nothing about. */
  const availability = course.availability ?? 'open';
  if (availability !== 'open') {
    return (
      <button type="button" className={cls} disabled>
        {availability === 'coming_soon' ? 'Coming soon' : 'Closed to new enrolments'}
      </button>
    );
  }

  if (course.price) {
    return (
      <Link className={cls} to={`/learn/checkout?course=${course.slug}`}>
        <LmsIcon name="cart" />
        Enrol now
      </Link>
    );
  }

  // Free, but nobody to enrol yet. Carrying the destination means they land
  // back on this course after signing in rather than on a generic dashboard.
  if (!isAuthenticated) {
    return (
      <Link className={cls} to="/learn/login" state={{ from: { pathname: `/learn/courses/${course.slug}` } }}>
        <LmsIcon name="plus" />
        Enrol free
      </Link>
    );
  }

  const enrol = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await enrollmentsApi.enrol(course.id ?? course._id);
      // Let the page refresh itself if it can; otherwise open the course, which
      // reloads the outline and now shows the enrolled view.
      if (onEnrolled) await onEnrolled();
      else navigate(`/learn/courses/${course.slug}`);
    } catch (err) {
      setError(err?.message ?? 'Could not enrol you just now.');
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={cls} onClick={enrol} disabled={busy}>
        <LmsIcon name="plus" />
        {busy ? 'Enrolling…' : 'Enrol free'}
      </button>
      {error ? <p className="lms-field__error">{error}</p> : null}
    </>
  );
}
