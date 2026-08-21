import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { careersApi } from '../../../api';
import './CareersBand.css';
import Arrow from '../../../components/shared/Arrow.jsx';

// The careers band.
//
// Live openings from the CMS when there are any, and the four standing career
// levels when there are not. The fallback is not filler: the levels are how the
// firm describes its ladder whether or not a seat is open this month, and a
// careers band that disappears the moment hiring pauses tells a candidate the
// firm has stopped growing.
const LEVELS = [
  {
    title: 'Graduate',
    body:
      'A structured first year in procurement, working alongside senior advisers on live engagements across the public and private sectors.',
  },
  {
    title: 'Analyst',
    body:
      'Market research, spend and data analysis, drafting tender documentation, and helping evaluation panels reach defensible decisions.',
  },
  {
    title: 'Consultant',
    body:
      'Run end-to-end procurement processes with clients, from sourcing strategy through approach to market and award.',
  },
  {
    title: 'Senior Consultant',
    body:
      'Lead engagements and client relationships, advise on complex procurements, and mentor the team working with you.',
  },
];

export default function CareersBand() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();
  const [openings, setOpenings] = useState(null);

  useEffect(() => {
    let alive = true;
    careersApi
      .listOpenings({ limit: 4 })
      .then((list) => {
        if (alive) setOpenings((list || []).slice(0, 4));
      })
      .catch(() => {
        // Leave `openings` null so the standing levels below are what shows.
      });
    return () => {
      alive = false;
    };
  }, []);

  const live = openings && openings.length > 0;
  const cards = live
    ? openings.map((o) => ({
        key: o._id || o.title,
        title: o.title,
        // `description` is the field on JobOpening — see be/src/models/JobOpening.js.
        body: o.description || '',
      }))
    : LEVELS.map((l) => ({ key: l.title, title: l.title, body: l.body }));

  return (
    <section
      ref={ref}
      id="careers"
      className={`hm-band hm-band--light${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="home-careers-title"
    >
      <div className="hm-shell hm-band__head hm-reveal">
        <h2 className="hm-band__title" id="home-careers-title">
          Build a career in procurement
        </h2>
        <p className="hm-band__lede">
          {live
            ? 'Open roles right now. Every one of them works on live procurements from day one.'
            : 'From a structured graduate year through to leading engagements. Every role works on live procurements from day one.'}
        </p>
      </div>

      <div className="hm-shell">
        <ul className="cb__grid">
          {cards.map((card, i) => (
            <li
              className="cb__item hm-reveal"
              data-delay={String(Math.min(4, i))}
              key={card.key}
            >
              <article className="cb__card">
                <h3 className="cb__title">{card.title}</h3>
                {card.body && <p className="cb__body">{card.body}</p>}
              </article>
            </li>
          ))}
        </ul>

        <Link className="hm-arrow" to="/careers">
          See open roles <Arrow />
        </Link>
      </div>
    </section>
  );
}
