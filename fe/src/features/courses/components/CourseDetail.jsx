import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import RegisterInterestForm from '../../../components/forms/RegisterInterestForm.jsx';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
import './CourseDetail.css';

// Course data (title, summary, body, image, media, availability) comes from the
// CMS API — fetched by slug in CourseDetailPage and passed in as a prop.

const SEGMENT_LABEL = { win: 'Win Contracts', award: 'Award Contracts', general: 'General' };

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/* --- small sidebar icons --- */
const Icon = {
  item: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 9h8M8 13h5" />
    </svg>
  ),
  status: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  ),
  level: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20V10M12 20V4M19 20v-6" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  pdf: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="9" r="1.4" />
    </svg>
  ),
};

export default function CourseDetail({ course, status = 'ready' }) {
  const { audience } = useAudience();
  // Held until the course is here. Without it the reveal plays over the
  // "Loading course…" line and the real page, arriving into a section that has
  // already finished animating, is painted at full opacity in one frame.
  const { ref, inView } = useInView({ ready: status === 'ready' && Boolean(course) });

  // The wait itself: nothing on the band but its ground. The course fades in
  // when it arrives, and a "Loading course…" line under a placeholder "Course"
  // heading is two things to take away before it can.
  if (status === 'loading') {
    return (
      <section key="cd-pending" className="cd hm-band--light" data-audience={audience}>
        <LoadingStatus loading label="Loading course" />
      </section>
    );
  }

  // Error and not-found are messages, not waits — they say what happened and
  // offer the way back, and they are readable straight away (`is-in` outright
  // rather than `inView`, since `.cd__main` is what the reveal hides). The key
  // is what makes the swap to the loaded page a fresh mount rather than a diff
  // over the same nodes, which is what gives the reveal below an element
  // painted hidden to animate from.
  if (status !== 'ready' || !course) {
    const message =
      status === 'notfound'
        ? "We couldn't find that course."
        : "We couldn't load this course right now. Please try again shortly.";
    return (
      <section
        key="cd-pending"
        className="cd hm-band--light is-in"
        data-audience={audience}
      >
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

  const isComingSoon = course.availability === 'coming_soon';

  const learnPoints = course.learnPoints || [];
  const requirements = course.requirements || [];
  const whoShouldTake = course.whoShouldTake || [];
  const includes = course.includes || [];
  const access = course.access || [];

  const segmentLabel = SEGMENT_LABEL[course.segment];
  const levelLabel = course.levelLabel || (course.level ? `${cap(course.level)} level` : '');
  const priceLabel =
    typeof course.price === 'number' && course.price > 0
      ? `$${course.price.toLocaleString()}`
      : 'Free';

  // Purchase CTA. Coming-soon courses collect interest; open courses buy/enrol.
  const ctaLabel = isComingSoon ? 'Register interest' : 'Buy course';
  /* "Buy course" used to link to a consultation booking, from before there was
     a checkout. It now enters the LMS: sign in, then the checkout or the course
     depending on what they already own. Coming-soon still collects interest —
     there is nothing to sell yet. */
  const PrimaryCta = isComingSoon ? (
    <a className="cd-buy__cta" href="#register-interest">{ctaLabel}</a>
  ) : (
    <Link className="cd-buy__cta" to={`/learn/courses/${course.slug}/start`}>{ctaLabel}</Link>
  );

  return (
    <section
      key="cd-ready"
      ref={ref}
      className={`cd hm-band--light${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="cd__inner">
        {/* --- main column --- */}
        <div className="cd__main">
          <h1 className="cd__title">{course.title}</h1>
          {course.summary && <p className="cd__subtitle">{course.summary}</p>}

          {/* Instructor byline + audience / level tags. */}
          <div className="cd-instructor">
            {course.instructor?.avatarUrl ? (
              <img
                className="cd-instructor__avatar"
                src={course.instructor.avatarUrl}
                alt=""
                loading="lazy"
              />
            ) : (
              <span className="cd-instructor__avatar" aria-hidden="true" />
            )}
            <span className="cd-instructor__name">
              {course.instructor?.name || 'Instructor'}
            </span>
            <span className="cd-instructor__tags">
              {segmentLabel && <span className="cd-instructor__tag">{segmentLabel}</span>}
              {levelLabel && <span className="cd-instructor__level">{levelLabel}</span>}
            </span>
          </div>

          {/* The course image, and only the course image.

              This used to hoist the first attached video or YouTube link into
              a player here. Lesson content now lives where it belongs — in the
              lessons — so the sales page shows the cover and the curriculum
              below it, and the videos are seen inside the LMS under the same
              preview-or-enrol rule as everything else. */}
          {course.image?.url && (
            <img className="cd-video" src={course.image.url} alt={course.title} />
          )}

          {/* What you'll learn — two-column checklist. */}
          {learnPoints.length > 0 && (
            <div className="cd-panel">
              <h2 className="cd-panel__title">What you&rsquo;ll learn</h2>
              <ul className="cd-learn">
                {learnPoints.map((point, i) => (
                  <li className="cd-learn__item" key={i}>
                    <span className="cd-check" aria-hidden="true">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements + description + audience, in one card. */}
          {(requirements.length > 0 || course.body || whoShouldTake.length > 0) && (
            <div className="cd-panel">
              {requirements.length > 0 && (
                <div className="cd-section cd-section--first">
                  <h2 className="cd-section__title">Requirements</h2>
                  <ul className="cd-bullets">
                    {requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {course.body && (
                <div className="cd-section">
                  <h2 className="cd-section__title">Course description</h2>
                  <div
                    className="cd-prose"
                    // Body is trusted rich HTML authored in the CMS.
                    dangerouslySetInnerHTML={{ __html: course.body }}
                  />
                </div>
              )}

              {whoShouldTake.length > 0 && (
                <div className="cd-section">
                  <h2 className="cd-section__title">Who should take this course?</h2>
                  <ul className="cd-rich-list">
                    {whoShouldTake.map((who, i) => (
                      <li key={i}>
                        <strong>{who.title}:</strong> {who.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Coming-soon courses take interest registrations here. */}
          {isComingSoon && (
            <div className="cd-interest" id="register-interest">
              <RegisterInterestForm courseId={course._id} courseTitle={course.title} />
            </div>
          )}
        </div>

        {/* --- purchase sidebar --- */}
        <aside className="cd__aside">
          <div className="cd-buy">
            <h2 className="cd-buy__title">Start learning today!</h2>
            {course.sidebarSummary && <p className="cd-buy__blurb">{course.sidebarSummary}</p>}

            <p className="cd-buy__price">
              {priceLabel}
              {course.currency && course.price > 0 && (
                <span className="cd-buy__currency"> {course.currency}</span>
              )}
            </p>

            {PrimaryCta}

            {includes.length > 0 && (
              <>
                <p className="cd-buy__group-label">This includes</p>
                <ul className="cd-buy__list">
                  {includes.map((item, i) => (
                    <li className="cd-buy__row" key={i}>{Icon.item}<span>{item}</span></li>
                  ))}
                </ul>
              </>
            )}

            {access.length > 0 && (
              <>
                <p className="cd-buy__group-label">Access</p>
                <ul className="cd-buy__list">
                  {access.map((item, i) => (
                    <li className="cd-buy__row" key={i}>{Icon.item}<span>{item}</span></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Small screens replace the sidebar with a sticky bottom bar. */}
      <div className="cd-bar">
        <span className="cd-bar__title">{course.title}</span>
        {course.price > 0 && <span className="cd-bar__price">{priceLabel}</span>}
        {isComingSoon ? (
          <a className="cd-bar__cta" href="#register-interest">{ctaLabel}</a>
        ) : (
          <Link className="cd-bar__cta" to={`/learn/courses/${course.slug}/start`}>{ctaLabel}</Link>
        )}
      </div>
    </section>
  );
}
