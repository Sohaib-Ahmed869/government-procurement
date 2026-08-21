import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { capabilitiesApi, capabilityCardsCache } from '../../../api';
import { useInView } from '../../../hooks/useInView.js';
import { resolveServices } from '../../serviceOffering/services.js';
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF } from '../../../constants/contact.js';
import './EngageServices.css';

/* ---------------------------------------------------------------------------
   "How to Engage Us" for the WIN segment.

   The Award side of this page is a list of panels, and that is the right answer
   for a buyer: a government agency that already purchases under one of those
   arrangements can appoint us directly under it. A supplier cannot. Panels are
   how government buys, not how a bidder engages a consultant, so showing them
   the same list answers a question they did not ask.

   What a bidder wants to know is: which of these do you do for me, and how do I
   start? So each row names a service and carries the three ways to begin it —
   call, email, or ask for a consultation. The action is on the row rather than
   collected at the foot of the page, because the decision to get in touch is
   made against a particular service, not against the page as a whole.

   The services are the SAME six the Service Offering page lists, read from the
   same resolver, in the order a bidder meets them. A second hand-kept list here
   would drift from that page the first time an editor renamed something.
   ------------------------------------------------------------------------ */

// Fallback copy, per service, for the Win side. Shown until an editor writes
// the card in the CMS — a row that is a heading and three buttons tells a
// bidder nothing about what they would be buying.
const FALLBACK = {
  'procurement-strategy':
    'Read the approach before it is published, and decide whether this is a bid worth putting a team on.',
  probity:
    'Understand the probity rules the buyer is working to, so nothing in your response puts the bid at risk.',
  'process-management':
    'Keep the response on track: addenda, clarification questions, and a submission that meets every formatting rule.',
  'evaluation-negotiation':
    'Know how your response will be scored, and hold your position through negotiation without losing the contract.',
  'vendor-transition':
    'Stand the contract up cleanly once you have won it, against the transition plan you committed to.',
  'contract-management':
    'Keep the contract healthy through its term, and be ready for the extension or the re-tender at the end of it.',
};

function ActionIcon({ name }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 16,
    height: 16,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (name === 'phone') {
    return (
      <svg {...common}>
        <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6 4z" />
      </svg>
    );
  }
  if (name === 'mail') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 12h13" />
      <path d="m12 6 6 6-6 6" />
    </svg>
  );
}

export default function EngageServices({ audience }) {
  const { ref, inView } = useInView({ threshold: 0 });
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
    <section
      ref={ref}
      className={`eng${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-label="How to engage us"
    >
      <div className="eng__inner">
        <ul className="eng__list">
          {services.map((service, i) => (
            // `--i` drives the reveal stagger in the stylesheet. Set here rather
            // than by :nth-child so adding a service cannot leave the new row
            // with no delay while the rest still animate.
            <li className="eng__row" key={service.key} style={{ '--i': i }}>
              <div className="eng__body">
                <h2 className="eng__title">{service.title}</h2>
                <p className="eng__copy">
                  {service.body || FALLBACK[service.key] || ''}
                </p>
              </div>

              {/* The three ways in, on the row. `tel:` and `mailto:` stay plain
                  anchors — they are not routes, and handing them to the router
                  would swallow them. The subject line names the service so an
                  enquiry arrives already knowing what it is about. */}
              <div className="eng__actions">
                <a className="eng__action" href={CONTACT_PHONE_HREF}>
                  <ActionIcon name="phone" />
                  <span className="eng__action-label">Call</span>
                  <span className="eng__sr">{CONTACT_PHONE}</span>
                </a>
                <a
                  className="eng__action"
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(service.title)}`}
                >
                  <ActionIcon name="mail" />
                  <span className="eng__action-label">Email</span>
                </a>
                <Link
                  className="eng__action eng__action--primary"
                  to={`/book-a-consultation?service=${encodeURIComponent(service.key)}`}
                >
                  <span className="eng__action-label">Request a consultation</span>
                  <ActionIcon name="arrow" />
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <p className="eng__note" style={{ '--i': services.length }}>
          Prefer to talk it through first? Call{' '}
          <a href={CONTACT_PHONE_HREF}>{CONTACT_PHONE}</a> or email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </section>
  );
}
