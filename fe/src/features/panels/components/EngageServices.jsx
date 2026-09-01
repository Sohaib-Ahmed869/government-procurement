import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { engageServicesApi } from '../../../api';
import { useInView } from '../../../hooks/useInView.js';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
import { readCache, writeCache, hasCache } from '../../../api/cache.js';
import './EngageServices.css';

// What this section's read is remembered under for the life of the tab.
const CACHE_KEY = 'engage-services';

/* ---------------------------------------------------------------------------
   "How to Engage Us" for the WIN segment.

   The Award side of this page is a list of panels, and that is the right answer
   for a buyer: a government agency that already purchases under one of those
   arrangements can appoint us directly under it. A supplier cannot. Panels are
   how government buys, not how a bidder engages a consultant, so showing them
   the same list answers a question they did not ask.

   What a bidder wants to know is: which of these do you do for me, and how do I
   start? So each row names a service and carries the way to begin it: a
   consultation request that arrives already naming the service. The action is on
   the row rather than collected at the foot of the page, because the decision to
   get in touch is made against a particular service, not against the page as a
   whole — and for the same reason the row does NOT repeat the switchboard number
   and the general inbox, which are the same on every row. The "Prefer to talk it
   through first?" line that used to carry those under the list has gone with
   them: the header's Request a Consultation button and the footer's contact
   block are on every page and say the same thing.

   The rows are this page's OWN content, edited in the CMS under How to Engage
   Us → Win Contracts.

   They used to be the Service Offering page's capability cards, read through
   that page's resolver, on the reasoning that a second hand-kept list would
   drift from it. That traded one problem for a worse one: the two pages are
   written for different readers, so an editor who wanted this one to say
   something a bidder needed had nowhere to say it, and an editor who renamed a
   service on Service Offering rewrote this page without knowing. They are
   separate collections now — drifting apart is what they are FOR.
   ------------------------------------------------------------------------ */

// Only the arrow is left, now that the rows carry one action; `name` stays in
// the signature so a second icon can come back without changing the call sites.
function ActionIcon() {
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
  return (
    <svg {...common}>
      <path d="M4 12h13" />
      <path d="m12 6 6 6-6 6" />
    </svg>
  );
}

// Where a row's action goes. The service reference is what the consultation
// form reads to arrive pre-filled; a row without one still links to the form,
// it just arrives unlabelled rather than pointing at `?service=undefined`.
function consultationHref(service) {
  const key = String(service.serviceKey || '').trim();
  return key
    ? `/book-a-consultation?service=${encodeURIComponent(key)}`
    : '/book-a-consultation';
}

export default function EngageServices({ audience }) {
  // Seeded from the tab's cache, so a return visit renders the rows on the
  // first frame instead of holding a viewport of empty space — see api/cache.js.
  const [services, setServices] = useState(() => readCache(CACHE_KEY) ?? []);
  // Whether the fetch has come back at all — a failed or empty list is still an
  // answer, and the reveal has to be released either way or the section would
  // sit hidden forever waiting for rows that are never coming. A cached answer
  // counts as one.
  const [loaded, setLoaded] = useState(() => hasCache(CACHE_KEY));

  useEffect(() => {
    let alive = true;
    engageServicesApi
      .list()
      .then((list) => {
        writeCache(CACHE_KEY, list || []);
        if (alive) setServices(list || []);
      })
      .catch(() => {
        /* the section renders empty rather than breaking the page */
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // The rows ARE the section, so the reveal waits for them — see the note on
  // `ready` in useInView.
  const { ref, inView } = useInView({ threshold: 0, ready: loaded });

  return (
    <section
      ref={ref}
      className={`eng${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-label="How to engage us"
    >
      <div className="eng__inner">
        {/* The rows are the whole section, so until they arrive this page is a
            hero and nothing else — and the footer's contact band comes up to
            the fold to fill it. Held open instead. */}
        <LoadingStatus loading={!loaded} label="Loading services" />

        <ul className="eng__list">
          {services.map((service, i) => (
            // `--i` drives the reveal stagger in the stylesheet. Set here rather
            // than by :nth-child so adding a service cannot leave the new row
            // with no delay while the rest still animate.
            <li className="eng__row" key={service._id || service.id} style={{ '--i': i }}>
              <div className="eng__body">
                <h2 className="eng__title">{service.title}</h2>
                <p className="eng__copy">{service.body}</p>
              </div>

              {/* One way in, on the row. It carried three — call, email and the
                  consultation form — and the two contact links were the wrong
                  two to repeat on every row: they are the same number and the
                  same address on every row, and they say nothing about the
                  service they sit beside. What is left is the action that IS
                  particular to the row: a consultation request that arrives
                  naming the service it came from. */}
              <div className="eng__actions">
                <Link
                  className="eng__action eng__action--primary"
                  to={consultationHref(service)}
                >
                  <span className="eng__action-label">Request a consultation</span>
                  <ActionIcon />
                </Link>
              </div>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}
