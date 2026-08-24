import { useEffect, useId, useState } from 'react';
import { capabilitiesApi, capabilityCardsCache } from '../../../api';
import { useInView } from '../../../hooks/useInView.js';
import { resolveServices } from '../services.js';
import './ServiceAccordion.css';

// A5 — the six services, as an accordion.
//
// This was six full-width rows, each a photograph beside a paragraph, the sides
// and the band alternating down the page. It read well and it was six screens
// long: to find out whether the firm does contract management you scrolled past
// five other services first, and the page never showed you what it held.
//
// An accordion shows the whole list at once — the six names, one under the
// other, on a rule each — and gives you the paragraph for the one you asked
// about. One open at a time, so opening a service closes the one before it and
// the list never grows to the length it used to be.
//
// No photograph. It had a picture column on the right that changed with the
// open service; the list is the page, and the picture was half the width doing
// none of the work. The CMS image field went with it — model, endpoints and
// the admin picker — rather than leaving an upload nothing would display.

// Shown when the CMS has nothing written for a service yet, so an open panel is
// never a heading over nothing. Replaced the moment an editor saves a card.
const FALLBACK_BODY = {
  award:
    'Our advisers work alongside your team on this through the whole procurement, from the decisions taken before market through to the contract you end up managing.',
  win:
    'Our advisers work alongside your team on this from the moment an opportunity appears, through the response itself, and into the contract if you win it.',
};

export default function ServiceAccordion({ audience }) {
  const [saved, setSaved] = useState(capabilityCardsCache.get);
  const { ref, inView } = useInView({ threshold: 0 });
  const baseId = useId();

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

  // The first service is open on arrival, so the page opens on a paragraph
  // rather than on a list of closed headings that looks like it failed to load.
  //
  // Index rather than key: the toggle recolours the page and rewrites the copy,
  // and holding a key would keep a service open across a change that rewrites
  // what it says. Reset to the top instead — same position, new segment.
  const [openIndex, setOpenIndex] = useState(0);
  useEffect(() => {
    setOpenIndex(0);
  }, [audience]);

  return (
    <section
      ref={ref}
      className={`sv${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-label="Our services"
    >
      <div className="sv__inner">
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
                      {service.body || FALLBACK_BODY[audience] || FALLBACK_BODY.award}
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
