import { useEffect, useState } from 'react';
import { capabilitiesApi, capabilityCardsCache } from '../../../api';
import { useInView } from '../../../hooks/useInView.js';
import { resolveServices } from '../services.js';
import ourExpertise from '../../../assets/images/OurexpertiseEnhance.png';
import enhanceExp from '../../../assets/images/EnhanceExpImage.png';
import homepageCourse from '../../../assets/images/HomepageCourse.png';
import mainPicture from '../../../assets/images/MainPictureHomepage.png';
import './ServiceRows.css';

// A5 — the Service Offering page as a run of rows rather than a grid of cards.
//
// One service per full-width row, the photograph and the copy swapping sides as
// you go down and the band alternating light, dark, light. That gives each of
// the six a screen of its own to be read on, which a 3-across grid of equal
// cards does not — and the alternation is what keeps a page of six identical
// layouts from reading as a list.
//
// Deliberately no buttons on a row. Every one would point at the same
// consultation form, so six rows would carry eighteen buttons to three
// destinations; the page's one call to action lives in the header and at the
// foot of the page instead.
//
// The fallback photographs. An editor can upload one per service in the CMS,
// which is what a row actually shows; these stand in until they do, so a row is
// never a heading over an empty column.
//
// Bound by key rather than positionally, so a service with no image named for
// it falls back rather than picking up the next one's photograph.
const IMAGES = {
  'procurement-strategy': enhanceExp,
  probity: ourExpertise,
  'process-management': mainPicture,
  'evaluation-negotiation': homepageCourse,
  'vendor-transition': enhanceExp,
  'contract-management': ourExpertise,
};

// Shown when the CMS has nothing written for a service yet, so a row is never
// a heading over an empty column. Replaced the moment an editor saves a card.
const FALLBACK_BODY = {
  award:
    'Our advisers work alongside your team on this through the whole procurement, from the decisions taken before market through to the contract you end up managing.',
  win:
    'Our advisers work alongside your team on this from the moment an opportunity appears, through the response itself, and into the contract if you win it.',
};

export default function ServiceRows({ audience }) {
  const [saved, setSaved] = useState(capabilityCardsCache.get);

  useEffect(() => {
    let alive = true;
    capabilitiesApi
      .list()
      .then((list) => {
        if (!list) return;
        capabilityCardsCache.set(list);
        if (alive) setSaved(list);
      })
      .catch(() => {
        /* leave whatever is already on screen */
      });
    return () => {
      alive = false;
    };
  }, []);

  const services = resolveServices(saved, audience);

  return (
    <div className="sr" data-audience={audience}>
      {services.map((service, i) => (
        <ServiceRow service={service} index={i} audience={audience} key={service.key} />
      ))}
    </div>
  );
}

// One row, revealed as it is scrolled to.
//
// This page had no reveal at all: its rows simply appeared, while every other
// page on the site fades its sections in. It is on the shared .hm-reveal now,
// driven by useInView the way a homepage band is.
//
// threshold 0 rather than the default 0.15: a row is a full-width photograph
// beside its copy and runs taller than a phone viewport, so waiting for 15% of
// it to be on screen can never fire.
function ServiceRow({ service, index, audience }) {
  const { ref, inView } = useInView({ threshold: 0 });

  return (
    <section
      ref={ref}
      className={`sr__row${index % 2 === 1 ? ' sr__row--flip' : ''}${inView ? ' is-in' : ''}`}
      aria-labelledby={`service-${service.key}`}
    >
      <div className="sr__inner hm-reveal">
        <div className="sr__media">
          <img src={service.image || IMAGES[service.key] || enhanceExp} alt="" loading="lazy" />
        </div>

        <div className="sr__body">
          <p className="sr__stage">{service.stage}</p>
          <h2 className="sr__title" id={`service-${service.key}`}>
            {service.title}
          </h2>
          <p className="sr__copy">
            {service.body || FALLBACK_BODY[audience] || FALLBACK_BODY.award}
          </p>
        </div>
      </div>
    </section>
  );
}
