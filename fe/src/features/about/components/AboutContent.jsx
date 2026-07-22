import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import Breadcrumbs from '../../../components/seo/Breadcrumbs.jsx';
import { pagesApi } from '../../../api';
import './AboutContent.css';

// Placeholder company copy — final wording comes from the CMS Pages editor later.
const HERO = {
  title: 'About Government Procurement',
  subtitle:
    'We help public sector organisations run fair, transparent, and outcome-driven tenders — turning complex procurement into clear, confident decisions.',
};

const STORY = {
  heading: 'Our story',
  paragraphs: [
    'Government Procurement was founded on a simple belief: public money deserves rigorous, impartial stewardship. For two decades we have partnered with agencies, councils, and departments to design tender processes that hold up to scrutiny and deliver genuine value.',
    'What began as a small advisory practice has grown into a trusted team of specialists spanning strategy, probity, evaluation, and capability building. Along the way we have kept our focus on the outcome that matters most — better services for the communities our clients serve.',
    'Today we support procurement leaders end to end, from early market engagement through to contract award and beyond, combining hands-on delivery with the practical training that leaves teams stronger than we found them.',
  ],
};

// Placeholder impact figures — replaced with verified numbers in the CMS later.
const STATS = [
  { value: '20+', label: 'Years of procurement expertise' },
  { value: '500+', label: 'Tenders supported to award' },
  { value: '10,000+', label: 'Practitioners trained' },
  { value: '98%', label: 'Client satisfaction rating' },
];

const VALUES = [
  {
    title: 'Integrity first',
    body: 'Probity is not a checkbox. We build fairness and transparency into every stage so decisions stand up to any level of scrutiny.',
  },
  {
    title: 'Outcomes over process',
    body: 'Compliance is the floor, not the goal. We design procurement around the results and public value our clients need to deliver.',
  },
  {
    title: 'Capability we leave behind',
    body: 'We work alongside your people, sharing the methods and judgement that keep teams confident long after our engagement ends.',
  },
  {
    title: 'Clarity in complexity',
    body: 'Procurement can be dense. We translate rules, risk, and strategy into plain guidance people can actually act on.',
  },
];

const CTA = {
  heading: 'Work with us',
  body: 'Ready to run a tender with confidence? Book a consultation and let us map the path to a stronger procurement outcome.',
  action: 'Book a consultation',
  href: '/book-a-consultation',
};

export default function AboutContent() {
  const hero = useInView();
  const story = useInView();
  const stats = useInView();
  const values = useInView();
  const cta = useInView();

  // Main heading + story body come from the CMS Pages editor. We keep the
  // placeholder copy as a fallback so the page never breaks while loading, or
  // if the fetch fails / returns nothing.
  const [page, setPage] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await pagesApi.getBySlug('about');
        if (alive) setPage(data || null);
      } catch {
        if (alive) setPage(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const heroTitle = page?.title || HERO.title;
  const storyHtml = page?.body?.trim() ? page.body : null;

  return (
    <div className="about">
      <section
        ref={hero.ref}
        className={`about-hero${hero.inView ? ' is-in' : ''}`}
      >
        <div className="about-hero__inner">
          <h1 className="about-hero__title">{heroTitle}</h1>
          <p className="about-hero__subtitle">{HERO.subtitle}</p>
        </div>
      </section>

      <section
        ref={story.ref}
        className={`about-story${story.inView ? ' is-in' : ''}`}
      >
        <div className="about-story__inner">
          <Breadcrumbs items={[{ label: 'About' }]} />
          <div className="about-story__grid">
            <div className="about-story__lead">
              <h2 className="about-story__heading">{STORY.heading}</h2>
            </div>
            <div className="about-story__body">
              {storyHtml ? (
                <div
                  className="about-story__html"
                  // Sanitised, editor-controlled HTML from the CMS Pages body.
                  dangerouslySetInnerHTML={{ __html: storyHtml }}
                />
              ) : (
                STORY.paragraphs.map((p, i) => (
                  <p className="about-story__para" key={i}>
                    {p}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        ref={stats.ref}
        className={`about-stats${stats.inView ? ' is-in' : ''}`}
      >
        <div className="about-stats__inner">
          <ul className="about-stats__grid">
            {STATS.map((stat, i) => (
              <li className="about-stat" key={stat.label} style={{ '--i': i }}>
                <span className="about-stat__value">{stat.value}</span>
                <span className="about-stat__label">{stat.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        ref={values.ref}
        className={`about-values${values.inView ? ' is-in' : ''}`}
      >
        <div className="about-values__inner">
          <h2 className="about-values__heading">What we value</h2>
          <ul className="about-values__grid">
            {VALUES.map((value, i) => (
              <li className="about-value" key={value.title} style={{ '--i': i }}>
                <h3 className="about-value__title">{value.title}</h3>
                <p className="about-value__body">{value.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        ref={cta.ref}
        className={`about-cta${cta.inView ? ' is-in' : ''}`}
      >
        <div className="about-cta__inner">
          <h2 className="about-cta__heading">{CTA.heading}</h2>
          <p className="about-cta__body">{CTA.body}</p>
          <Link className="about-cta__button" to={CTA.href}>
            {CTA.action}
          </Link>
        </div>
      </section>
    </div>
  );
}
