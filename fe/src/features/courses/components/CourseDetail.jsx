import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import RegisterInterestForm from '../../../components/forms/RegisterInterestForm.jsx';
import './CourseDetail.css';

// Course data (title, summary, body, image, pricing, availability) comes from
// the CMS API — fetched by slug in CourseDetailPage and passed in as a prop.

const AVAILABILITY_LABEL = {
  open: 'Open',
  coming_soon: 'Coming soon',
  closed: 'Closed',
};

function BookIcon() {
  return (
    <svg className="cd-book" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 6.5C10.5 5.3 8.7 4.8 6.5 4.8c-1 0-2 .1-2.9.4v12.6c.9-.3 1.9-.4 2.9-.4 2.2 0 4 .5 5.5 1.7M12 6.5c1.5-1.2 3.3-1.7 5.5-1.7 1 0 2 .1 2.9.4v12.6c-.9-.3-1.9-.4-2.9-.4-2.2 0-4 .5-5.5 1.7M12 6.5V19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CourseDetail({ course, status = 'ready' }) {
  const { ref, inView } = useInView();

  // Loading / error / not-found states, themed to match the detail page.
  if (status !== 'ready' || !course) {
    let message = 'Loading course…';
    if (status === 'error') {
      message = "We couldn't load this course right now. Please try again shortly.";
    } else if (status === 'notfound') {
      message = "We couldn't find that course.";
    }
    return (
      <section ref={ref} className={`cd${inView ? ' is-in' : ''}`}>
        <div className="cd__inner">
          <div className="cd__main">
            <h1 className="cd__title">{status === 'notfound' ? 'Course not found' : 'Course'}</h1>
            <p className="cd__subtitle">{message}</p>
            <p className="cd-section__para">
              <Link to="/courses">Back to all courses</Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  const availabilityLabel = AVAILABILITY_LABEL[course.availability] || course.availability;
  // Coming-soon courses invite interest via an inline form; open courses invite
  // a consultation via a link.
  const isComingSoon = course.availability === 'coming_soon';
  const ctaLabel = isComingSoon ? 'Register interest' : 'Book a consultation';

  return (
    <section ref={ref} className={`cd${inView ? ' is-in' : ''}`}>
      <div className="cd__inner">
        {/* --- main column --- */}
        <div className="cd__main">
          <h1 className="cd__title">{course.title}</h1>
          {course.summary && <p className="cd__subtitle">{course.summary}</p>}

          {course.image?.url && (
            <img className="cd-video" src={course.image.url} alt={course.title} />
          )}

          {course.body && (
            <div className="cd-panel">
              <div
                className="cd-section"
                // Body is trusted rich HTML authored in the CMS.
                dangerouslySetInnerHTML={{ __html: course.body }}
              />
            </div>
          )}

          {/* Coming-soon courses take interest registrations here. Rendered in
              the main column so it stays reachable on small screens, where the
              sidebar is hidden in favour of the sticky bar. */}
          {isComingSoon && (
            <div className="cd-interest" id="register-interest">
              <RegisterInterestForm courseId={course._id} courseTitle={course.title} />
            </div>
          )}
        </div>

        {/* --- pricing sidebar --- */}
        <aside className="cd__aside">
          <div className="cd-buy">
            <h2 className="cd-buy__title">{course.title}</h2>
            {course.summary && <p className="cd-buy__blurb">{course.summary}</p>}
            {course.priceLabel && (
              <p className="cd-buy__price">{course.priceLabel}</p>
            )}
            {isComingSoon ? (
              <a className="cd-buy__cta" href="#register-interest">
                {ctaLabel}
              </a>
            ) : (
              <Link className="cd-buy__cta" to="/book-a-consultation">
                {ctaLabel}
              </Link>
            )}

            <p className="cd-buy__group-label">This course</p>
            <ul className="cd-buy__list">
              {availabilityLabel && (
                <li className="cd-buy__row">
                  <BookIcon />
                  <span>{availabilityLabel}</span>
                </li>
              )}
              {course.durationLabel && (
                <li className="cd-buy__row">
                  <BookIcon />
                  <span>{course.durationLabel}</span>
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      {/* Small screens replace the pricing sidebar with a sticky bottom bar. */}
      <div className="cd-bar">
        <span className="cd-bar__title">{course.title}</span>
        {course.priceLabel && <span className="cd-bar__price">{course.priceLabel}</span>}
        {isComingSoon ? (
          <a className="cd-bar__cta" href="#register-interest">
            {ctaLabel}
          </a>
        ) : (
          <Link className="cd-bar__cta" to="/book-a-consultation">
            {ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
