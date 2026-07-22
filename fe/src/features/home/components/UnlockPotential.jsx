import { useEffect, useRef, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { coursesApi } from '../../../api';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import cardImage from '../../../assets/images/MainPictureHomepage.png';
import bannerImage from '../../../assets/images/HomepageCourse.png';
import './UnlockPotential.css';

// White circle with the dark arrow glyph, scaled to crop the PNG's padding.
function ArrowCircle({ size = 36 }) {
  return (
    <span className="uy__arrow" aria-hidden="true">
      <img src={arrowIcon} alt="" style={{ width: `${size}px`, height: `${size}px` }} />
    </span>
  );
}

// Fallbacks so the bento still renders if the API is empty or unreachable.
const FALLBACK_COURSE = { title: 'Introduction to Government Procurement' };
const FALLBACK_ARTEFACT = { title: 'Steps in the Procurement Cycle' };
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
      coursesApi.list({ resourceType: 'courses', limit: 4, sort: '-featured' }).catch(() => []),
      coursesApi.list({ resourceType: 'artefacts', limit: 2, sort: '-featured' }).catch(() => []),
    ]).then(([c, a]) => {
      if (!alive) return;
      setCourses(c || []);
      setArtefacts(a || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Slot the fetched content into the bento, padding with fallbacks so the
  // layout keeps its shape regardless of how many records exist.
  const featureArtefacts = [artefacts[0] || FALLBACK_ARTEFACT, artefacts[1] || FALLBACK_ARTEFACT];
  const gridCourses = [
    courses[0] || FALLBACK_COURSE,
    courses[1] || FALLBACK_COURSE,
    courses[2] || FALLBACK_COURSE,
  ];
  const wideCourse = courses[3] || courses[0] || FALLBACK_COURSE;

  // Cards shown in the mobile carousel: 2 feature + 3 course + 1 wide.
  const CARD_COUNT = 6;

  // On mobile the bento is a horizontal snap carousel; track which card is centred
  // so the pagination dots stay in sync.
  const onBentoScroll = () => {
    const el = bentoRef.current;
    const card = el?.querySelector('.uy__card');
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const step = card.getBoundingClientRect().width + gap;
    const idx = step ? Math.round(el.scrollLeft / step) : 0;
    setActiveCard(Math.max(0, Math.min(CARD_COUNT - 1, idx)));
  };

  const scrollToCard = (i) => {
    const cards = bentoRef.current?.querySelectorAll('.uy__card');
    cards?.[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <section
      ref={ref}
      className={`uy${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="uy__inner">
        <p className="uy__eyebrow">Courses &amp; Artefacts</p>
        <h2 className="uy__heading">Unlock Your Potential</h2>

        {/* Featured banner */}
        <div className="uy__banner">
          <img src={bannerImage} alt="" className="uy__banner-img" />
          <div className="uy__banner-body">
            <h3 className="uy__banner-title">
              Helping procurement officers unlock their potential
            </h3>
            <p className="uy__banner-sub">Join our academy to get ahead in your career.</p>
            <a className="uy__watch" href="/academy">
              <span className="uy__watch-dot" aria-hidden="true" />
              Watch video
            </a>
          </div>
        </div>

        {/* Bento grid (desktop) / swipeable carousel (mobile) */}
        <div className="uy__bento" ref={bentoRef} onScroll={onBentoScroll}>
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
              {gridCourses.map((c, i) => (
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
              ))}
            </div>

            <a
              className="uy__card uy__card--wide uy__card--neutral"
              href={linkOf(wideCourse, '/courses')}
            >
              <img src={imgOf(wideCourse)} alt="" className="uy__card-img" />
              <div className="uy__card-tint" />
              <div className="uy__card-body">
                <div className="uy__wide-row">
                  <h4 className="uy__card-title uy__card-title--sm">{wideCourse.title}</h4>
                  <ArrowCircle size={32} />
                </div>
                <p className="uy__card-label">Courses</p>
              </div>
            </a>
          </div>
        </div>

        {/* Pagination dots (mobile carousel only) */}
        <div className="uy__dots">
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
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
