import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useCourseOutline } from '../../hooks/useCourseOutline.js';

/* Where a course link from the public website lands (L6/C2).

   The marketing site sells a course; this decides what the buyer should
   actually see next, which depends on things the website has no way of knowing:
   whether they have an account, whether they already own it, and whether it is
   on sale.

   It is wrapped in StudentRoute, so a signed-out visitor is bounced to sign in
   FIRST and returned here afterwards — which is the whole point. Working it out
   before they sign in would mean deciding on behalf of a person we cannot yet
   identify.

   Then:
     already enrolled   → the course itself
     paid, not owned    → the checkout, with the course in the basket
     free, not owned    → the course page, where one click enrols
     not open           → the course page, which explains why

   A resolver rather than a redirect on the server: the answer depends on the
   session, and putting it here keeps the public site's links stable — every
   course link is the same shape whoever clicks it. */
export default function CourseStartPage() {
  const { slug } = useParams();
  const { data, status, error } = useCourseOutline(slug);

  // Nothing is decided until the outline arrives; a guess here would send a
  // paying customer to the wrong screen.
  useEffect(() => {
    if (status === 'error') {
      // eslint-disable-next-line no-console
      console.warn('Could not resolve course', slug, error);
    }
  }, [status, slug, error]);

  if (status === 'loading') {
    return (
      <div className="lms-loading" role="status">
        Opening your course…
      </div>
    );
  }

  // No such course, or it is off the site. The course page says which — it
  // handles notfound and offline properly, so this does not duplicate that.
  if (status !== 'ready' || !data) {
    return <Navigate to={`/learn/courses/${slug}`} replace />;
  }

  const { course, enrolment, availability } = data;

  if (enrolment) return <Navigate to={`/learn/courses/${slug}`} replace />;

  // Not on sale, or free — either way the course page is the honest landing:
  // one explains itself, the other has a one-click enrol.
  if (availability !== 'open' || !course?.price) {
    return <Navigate to={`/learn/courses/${slug}`} replace />;
  }

  return <Navigate to={`/learn/checkout?course=${slug}`} replace />;
}
