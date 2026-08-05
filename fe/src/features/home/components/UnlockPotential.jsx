import { useEffect, useRef, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { coursesApi } from '../../../api';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import cardImage from '../../../assets/images/MainPictureHomepage.png';
import './UnlockPotential.css';

// White circle with the dark arrow glyph, scaled to crop the PNG's padding.
function ArrowCircle({ size = 36 }) {
  return (
    <span className="uy__arrow" aria-hidden="true">
      <img src={arrowIcon} alt="" style={{ width: `${size}px`, height: `${size}px` }} />
    </span>
  );
}

const imgOf = (item) => item?.image?.url || cardImage;
const linkOf = (item, fallbackHref) => (item?.slug ? `/courses/${item.slug}` : fallbackHref);

export default function UnlockPotential() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });
  const bentoRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  const [courses, setCourses] = useState([]);
  const [artefacts, setArtefacts] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      // "Featured on homepage" items come first; any remaining slots (up to 4
      // courses / 2 artefacts) are filled with the most recent of the rest.
      coursesApi.list({ resourceType: 'courses', limit: 4, sort: '-featured -createdAt' }).catch(() => []),
      coursesApi.list({ resourceType: 'artefacts', limit: 2, sort: '-featured -createdAt' }).catch(() => []),
    ]).then(([c, a]) => {
      if (!alive) return;
      setCourses(c || []);
      setArtefacts(a || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Everything below the heading is driven purely by what the CMS returns — no
  // hardcoded placeholder boxes. Decide which layout to show from the counts:
  //   • full      — 4+ courses AND 2+ artefacts: the standard bento.
  //   • courses   — 4+ courses, <2 artefacts: 4 course cards fill the full width.
  //   • artefacts — <4 courses, 2+ artefacts: 2 artefact cards fill the full width.
  //   • none      — neither threshold met: the section drops out entirely.
  // (The API caps courses at 4 and artefacts at 2, so these lengths equal the
  // thresholds exactly.)
  const enoughCourses = courses.length >= 4;
  const enoughArtefacts = artefacts.length >= 2;
  let mode = 'none';
  if (enoughCourses && enoughArtefacts) mode = 'full';
  else if (enoughCourses) mode = 'courses';
  else if (enoughArtefacts) mode = 'artefacts';

  const featureArtefacts = artefacts.slice(0, 2);
  const gridCourses = courses.slice(0, 3);
  const wideCourse = courses[3];

  // Cards in the mobile carousel: full = 2 feature + 3 course + 1 wide, otherwise
  // just the boxes that mode renders. ('none' never reaches the render below.)
  const cardCount = mode === 'full' ? 6 : mode === 'courses' ? 4 : 2;

  // A single course / artefact card — reused by the courses-only and
  // artefacts-only full-width layouts.
  const renderCourseCard = (c, i) => (
    <a
      className="uy__card uy__card--course"
      href={linkOf(c, '/courses')}
      key={c._id || `course-${i}`}
    >
      <img src={imgOf(c)} alt="" className="uy__card-img" />
      <div className="uy__card-tint" />
      <div className="uy__card-body">
        <p className="uy__card-label">Courses</p>
        <h4 className="uy__card-title uy__card-title--sm">{c.title}</h4>
      </div>
      <ArrowCircle size={32} />
    </a>
  );

  const renderArtefactCard = (a, i) => (
    <a
      key={a._id || `artefact-${i}`}
      className="uy__card uy__card--feature uy__card--neutral"
      href={linkOf(a, '/courses')}
    >
      <img src={imgOf(a)} alt="" className="uy__card-img" />
      <div className="uy__card-tint" />
      <div className="uy__card-body">
        <p className="uy__card-label">Artefacts</p>
        <h4 className="uy__card-title">{a.title}</h4>
      </div>
      <ArrowCircle />
    </a>
  );

  // The wide course banner that sits under the 3-up course grid. `large` gives it
  // the bigger title used when courses fill the whole section on their own.
  const renderWideCourseCard = (c, large = false) => (
    <a className="uy__card uy__card--wide uy__card--neutral" href={linkOf(c, '/courses')}>
      <img src={imgOf(c)} alt="" className="uy__card-img" />
      <div className="uy__card-tint" />
      <div className="uy__card-body">
        <div className="uy__wide-row">
          <h4 className={`uy__card-title${large ? '' : ' uy__card-title--sm'}`}>{c.title}</h4>
          <ArrowCircle size={32} />
        </div>
        <p className="uy__card-label">Courses</p>
      </div>
    </a>
  );

  // On mobile the bento is a horizontal snap carousel; track which card is centred
  // so the pagination dots stay in sync.
  const onBentoScroll = () => {
    const el = bentoRef.current;
    const card = el?.querySelector('.uy__card');
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const step = card.getBoundingClientRect().width + gap;
    const idx = step ? Math.round(el.scrollLeft / step) : 0;
    setActiveCard(Math.max(0, Math.min(cardCount - 1, idx)));
  };

  const scrollToCard = (i) => {
    const cards = bentoRef.current?.querySelectorAll('.uy__card');
    cards?.[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  // Nothing meets the thresholds (still loading, errored, or genuinely empty):
  // drop the whole section rather than leave its eyebrow heading standing over
  // an empty space. Same call as LatestInsights makes.
  if (mode === 'none') return null;

  return (
    <section
      ref={ref}
      className={`uy${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="uy__inner">
        <p className="uy__eyebrow">Courses &amp; artefacts</p>
        <h2 className="uy__title">Unlock your potential</h2>

        {/* Bento grid (desktop) / swipeable carousel (mobile). The layout adapts
            to how much content exists; see `mode` above. */}
        <div
          className={`uy__bento uy__bento--${mode}`}
          ref={bentoRef}
          onScroll={onBentoScroll}
        >
          {mode === 'full' && (
            <>
              <div className="uy__left">
                {featureArtefacts.map((a, i) => (
                  <a
                    key={a._id || `artefact-${i}`}
                    className={`uy__card uy__card--feature uy__card--neutral${i === 1 ? ' uy__card--short' : ''}`}
                    href={linkOf(a, '/courses')}
                  >
                    <img src={imgOf(a)} alt="" className="uy__card-img" />
                    <div className="uy__card-tint" />
                    <div className="uy__card-body">
                      <p className="uy__card-label">Artefacts</p>
                      <h4 className="uy__card-title">{a.title}</h4>
                    </div>
                    <ArrowCircle />
                  </a>
                ))}
              </div>

              <div className="uy__right">
                <div className="uy__courses">
                  {gridCourses.map((c, i) => renderCourseCard(c, i))}
                </div>

                {renderWideCourseCard(wideCourse)}
              </div>
            </>
          )}

          {/* Courses only — the same three-up grid + wide banner as the full
              bento's course column, now spanning the whole section width. */}
          {mode === 'courses' && (
            <div className="uy__right">
              <div className="uy__courses">
                {courses.slice(0, 3).map((c, i) => renderCourseCard(c, i))}
              </div>

              {renderWideCourseCard(courses[3], true)}
            </div>
          )}

          {/* Artefacts only — the two artefact cards span the full width. */}
          {mode === 'artefacts' && featureArtefacts.map((a, i) => renderArtefactCard(a, i))}
        </div>

        {/* Pagination dots (mobile carousel only) */}
        <div className="uy__dots">
          {Array.from({ length: cardCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`uy__dot${i === activeCard ? ' is-active' : ''}`}
              aria-label={`Go to card ${i + 1}`}
              onClick={() => scrollToCard(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
