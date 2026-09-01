import { useEffect, useId, useState } from 'react';
import { capabilitiesApi, capabilityCardsCache } from '../../../api';
import { useInView } from '../../../hooks/useInView.js';
import { resolveServices } from '../services.js';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
import './ServiceAccordion.css';

// The services, as an accordion. However many there are — the list is whatever
// the CMS holds for this segment, which is not the same list or the same number
// on Win as on Award.
//
// This was six full-width rows, each a photograph beside a paragraph, the sides
// and the band alternating down the page. It read well and it was six screens
// long: to find out whether the firm does contract management you scrolled past
// five other services first, and the page never showed you what it held.
//
// An accordion shows the whole list at once — every name, one under the other,
// on a rule each — and gives you the paragraph for the one you asked about. One
// open at a time, so opening a service closes the one before it and the list
// never grows to the length it used to be.
//
// No photograph. It had a picture column on the right that changed with the
// open service; the list is the page, and the picture was half the width doing
// none of the work. The CMS image field went with it — model, endpoints and
// the admin picker — rather than leaving an upload nothing would display.

export default function ServiceAccordion({ audience }) {
  const [saved, setSaved] = useState(capabilityCardsCache.get);
  const baseId = useId();

  // `null` until an answer arrives, which is what holds the reveal below. A
  // second visit in the same tab starts from the cache and is ready at once.
  const { ref, inView } = useInView({ threshold: 0, ready: saved !== null });

  useEffect(() => {
    let alive = true;
    capabilitiesApi
      .list()
      .then((list) => {
        if (!list) {
          // Nothing published. Still an answer — leaving `saved` null would
          // hold the reveal open on a page that has nothing more coming.
          if (alive) setSaved((current) => current ?? []);
          return;
        }
        capabilityCardsCache.set(list);
        if (alive) setSaved(list);
      })
      .catch(() => {
        /* leave whatever is already on screen */
        if (alive) setSaved((current) => current ?? []);
      });
    return () => {
      alive = false;
    };
  }, []);

  const services = resolveServices(saved, audience);

  // EVERYTHING CLOSED on arrival. -1 is "no service open".
  //
  // This used to open the first one, on the reasoning that a page of closed
  // headings looks like it failed to load. It reads the other way round: an
  // expanded first panel makes the service that happens to be listed first look
  // like the one being recommended, and it pushes the rest of the list down the
  // page so a visitor scrolling for the service they came for has to get past it.
  // The whole list visible and equal is the page.
  //
  // Index rather than key: the toggle recolours the page and rewrites the copy,
  // and holding a key would keep a service open across a change that rewrites
  // what it says. Closing on a segment change is the honest reset.
  const [openIndex, setOpenIndex] = useState(-1);
  useEffect(() => {
    setOpenIndex(-1);
  }, [audience]);

  return (
    <section
      ref={ref}
      className={`sv${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-label="Our services"
    >
      <div className="sv__inner">
        {/* The list is the page. Until it arrives there is nothing under the
            hero, and the footer's contact band rises to fill the gap — so the
            space is held for it. */}
        <LoadingStatus loading={saved === null} label="Loading services" />

        <ul className="sv__list hm-reveal">
          {services.map((service, i) => {
            const open = i === openIndex;
            const headId = `${baseId}-head-${i}`;
            const panelId = `${baseId}-panel-${i}`;

            return (
              <li className={`sv__item${open ? ' is-open' : ''}`} key={service.key}>
                {/* A heading that is also the control, which is the pairing a
                    screen reader needs: the six are still a list of headings
                    when you navigate by heading, and each one opens its own
                    panel when you press it. */}
                <h2 className="sv__heading">
                  <button
                    type="button"
                    className="sv__head"
                    id={headId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    // Clicking the open one closes it. A list where the last
                    // panel cannot be dismissed is a list with one dead control
                    // in it, which is always the one you just pressed.
                    onClick={() => setOpenIndex(open ? -1 : i)}
                  >
                    <span className="sv__name">{service.title}</span>
                    <span className="sv__sign" aria-hidden="true" />
                  </button>
                </h2>

                {/* Always in the tree, never `hidden`: the panel closes by
                    collapsing its own row to nothing, and a transition needs
                    something to transition. `inert` is what keeps a closed
                    panel out of the tab order and off a screen reader.

                    A real boolean, not `'' | undefined`. React treats `inert`
                    as a boolean attribute and an empty string is falsy to it,
                    so the first version of this dropped the attribute on every
                    closed panel and warned about it — the collapsed copy stayed
                    focusable and stayed on the accessibility tree, which is the
                    one thing the attribute was there to prevent. */}
                <div
                  className="sv__panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={headId}
                  inert={!open}
                >
                  <div className="sv__panel-inner">
                    <p className="sv__copy">
                      {service.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

      </div>
    </section>
  );
}
