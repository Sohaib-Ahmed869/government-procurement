import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import RegisterInterestForm from '../../../components/forms/RegisterInterestForm.jsx';
import './CourseDetail.css';

// Course data (title, summary, body, image, media, availability) comes from the
// CMS API — fetched by slug in CourseDetailPage and passed in as a prop.

const AVAILABILITY_LABEL = {
  open: 'Open',
  coming_soon: 'Coming soon',
  closed: 'Closed',
};

const RESOURCE_LABEL = { courses: 'Course', artefacts: 'Artefact', bundles: 'Bundle' };

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/* --- small sidebar icons --- */
const Icon = {
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
  const isComingSoon = course.availability === 'coming_soon';
  const ctaLabel = isComingSoon ? 'Register interest' : 'Book a consultation';

  const media = course.media || [];
  // The first video / YouTube link becomes the page's main player at the top,
  // so an attached video opens in place rather than only showing the thumbnail.
  const featured = media.find((m) => m.kind === 'video' || m.kind === 'youtube') || null;
  const featuredId = featured && (featured._id || featured.id);
  const rest = featured ? media.filter((m) => (m._id || m.id) !== featuredId) : media;

  // Counts for the "This course includes" sidebar breakdown.
  const videoCount = media.filter((m) => m.kind === 'video' || m.kind === 'youtube').length;
  const pdfCount = media.filter((m) => m.kind === 'pdf').length;
  const imageCount = media.filter((m) => m.kind === 'image').length;

  const CTA = isComingSoon ? (
    <a className="cd-buy__cta" href="#register-interest">{ctaLabel}</a>
  ) : (
    <Link className="cd-buy__cta" to="/book-a-consultation">{ctaLabel}</Link>
  );

  return (
    <section ref={ref} className={`cd${inView ? ' is-in' : ''}`}>
      <div className="cd__inner">
        {/* --- main column --- */}
        <div className="cd__main">
          <h1 className="cd__title">{course.title}</h1>
          {course.summary && <p className="cd__subtitle">{course.summary}</p>}

          {/* Primary media: play the attached video/YouTube in place; otherwise
              fall back to the course hero image. */}
          {featured ? (
            <div className="cd-primary">
              <CourseMediaItem item={featured} />
            </div>
          ) : (
            course.image?.url && (
              <img className="cd-video" src={course.image.url} alt={course.title} />
            )
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

          {/* Remaining materials, stacked vertically. */}
          {rest.length > 0 && (
            <div className="cd-materials">
              <h2 className="cd-materials__title">Course materials</h2>
              <div className="cd-materials__list">
                {rest.map((m) => (
                  <CourseMediaItem key={m._id || m.id} item={m} />
                ))}
              </div>
            </div>
          )}

          {/* Coming-soon courses take interest registrations here. */}
          {isComingSoon && (
            <div className="cd-interest" id="register-interest">
              <RegisterInterestForm courseId={course._id} courseTitle={course.title} />
            </div>
          )}
        </div>

        {/* --- details sidebar --- */}
        <aside className="cd__aside">
          <div className="cd-buy">
            <span className="cd-buy__eyebrow">{RESOURCE_LABEL[course.resourceType] || 'Course'}</span>
            <h2 className="cd-buy__title">{course.title}</h2>
            {course.summary && <p className="cd-buy__blurb">{course.summary}</p>}
            {CTA}

            <p className="cd-buy__group-label">Details</p>
            <ul className="cd-buy__list">
              {availabilityLabel && (
                <li className="cd-buy__row">{Icon.status}<span>{availabilityLabel}</span></li>
              )}
              {course.level && (
                <li className="cd-buy__row">{Icon.level}<span>{cap(course.level)} level</span></li>
              )}
              {course.durationLabel && (
                <li className="cd-buy__row">{Icon.clock}<span>{course.durationLabel}</span></li>
              )}
              {formatDate(course.startDate) && (
                <li className="cd-buy__row">{Icon.calendar}<span>Starts {formatDate(course.startDate)}</span></li>
              )}
            </ul>

            {media.length > 0 && (
              <>
                <p className="cd-buy__group-label">This {(RESOURCE_LABEL[course.resourceType] || 'Course').toLowerCase()} includes</p>
                <ul className="cd-buy__list">
                  {videoCount > 0 && (
                    <li className="cd-buy__row">{Icon.video}<span>{videoCount} {videoCount === 1 ? 'video' : 'videos'}</span></li>
                  )}
                  {pdfCount > 0 && (
                    <li className="cd-buy__row">{Icon.pdf}<span>{pdfCount} {pdfCount === 1 ? 'PDF resource' : 'PDF resources'}</span></li>
                  )}
                  {imageCount > 0 && (
                    <li className="cd-buy__row">{Icon.image}<span>{imageCount} {imageCount === 1 ? 'image' : 'images'}</span></li>
                  )}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Small screens replace the sidebar with a sticky bottom bar. */}
      <div className="cd-bar">
        <span className="cd-bar__title">{course.title}</span>
        {isComingSoon ? (
          <a className="cd-bar__cta" href="#register-interest">{ctaLabel}</a>
        ) : (
          <Link className="cd-bar__cta" to="/book-a-consultation">{ctaLabel}</Link>
        )}
      </div>
    </section>
  );
}

// Renders one attached course material by kind: a YouTube embed, an uploaded
// video player, an image, or a link to a PDF.
function CourseMediaItem({ item }) {
  if (item.kind === 'youtube') {
    return (
      <figure className="cd-media cd-media--player">
        <div className="cd-media__frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}`}
            title={item.title || 'Course video'}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {item.title && <figcaption className="cd-media__cap">{item.title}</figcaption>}
      </figure>
    );
  }

  if (item.kind === 'video') {
    return (
      <figure className="cd-media cd-media--player">
        <div className="cd-media__frame">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={item.url} controls preload="metadata" />
        </div>
        {item.title && <figcaption className="cd-media__cap">{item.title}</figcaption>}
      </figure>
    );
  }

  if (item.kind === 'image') {
    return (
      <figure className="cd-media cd-media--image">
        <a className="cd-media__frame" href={item.url} target="_blank" rel="noreferrer">
          <img src={item.url} alt={item.title || 'Course image'} loading="lazy" />
        </a>
        {item.title && <figcaption className="cd-media__cap">{item.title}</figcaption>}
      </figure>
    );
  }

  // pdf (or any document)
  return (
    <a className="cd-media cd-media--pdf" href={item.url} target="_blank" rel="noreferrer">
      <span className="cd-media__pdf-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </svg>
      </span>
      <span className="cd-media__pdf-text">
        <strong>{item.title || 'Document'}</strong>
        <span>PDF · Open</span>
      </span>
      <svg className="cd-media__pdf-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17 17 7M8 7h9v9" />
      </svg>
    </a>
  );
}
