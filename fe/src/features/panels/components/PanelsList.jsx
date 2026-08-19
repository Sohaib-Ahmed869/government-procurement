import { useEffect, useMemo, useState } from 'react';
import { panelsApi } from '../../../api';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import './PanelsList.css';

// B2 — the panels Government Procurement can be engaged through, by heading.
//
// No filters, no search, no chips. The reference page is a plain list and it is
// right to be: this is a credentials list of a few dozen rows that a client
// reads top to bottom looking for the one arrangement they already buy under.
// A filter bar over it would be furniture in front of the content.
export default function PanelsList() {
  const { audience } = useAudience();
  // threshold 0 — the list is taller than a phone viewport, so waiting for 15%
  // of it to be on screen means the reveal can never fire. Same trap the
  // article body hit (B1).
  const { ref, inView } = useInView({ threshold: 0 });

  const [panels, setPanels] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await panelsApi.list();
        if (!alive) return;
        setPanels(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Grouped by heading, headings in `groupOrder`.
  //
  // A group is not a record of its own — the order lives on each entry — so a
  // heading takes the LOWEST groupOrder among its rows. That way one entry left
  // at the default 0 cannot drag a whole heading to the top of the page, which
  // is the failure an editor would struggle to explain.
  //
  // The API has already sorted within a group (order, then name), and filtering
  // preserves that, so there is nothing to re-sort here.
  const groups = useMemo(() => {
    const byName = new Map();
    for (const panel of panels) {
      const key = panel.group || 'Other';
      if (!byName.has(key)) {
        byName.set(key, { name: key, order: panel.groupOrder ?? 0, items: [] });
      }
      const group = byName.get(key);
      group.order = Math.min(group.order, panel.groupOrder ?? 0);
      group.items.push(panel);
    }
    return [...byName.values()].sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name),
    );
  }, [panels]);

  return (
    <section
      ref={ref}
      className={`gp-list${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-label="Panels we can be engaged through"
    >
      <div className="gp-list__inner">
        {status === 'loading' && <p className="gp-empty">Loading panels…</p>}
        {status === 'error' && (
          <p className="gp-empty">
            We couldn&apos;t load the panels right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && panels.length === 0 && (
          <p className="gp-empty">
            Our panel appointments are being listed here shortly. In the meantime, get in
            touch and we will confirm the arrangements you can engage us through.
          </p>
        )}

        {groups.map((group) => (
          <section className="gp-group" key={group.name}>
            <h2 className="gp-group__head">{group.name}</h2>

            <ul className="gp-rows">
              {group.items.map((panel) => (
                <PanelRow key={panel._id || panel.id} panel={panel} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

// One line: agency – panel name (reference).
//
// The whole line is the link where there is somewhere to send people, and plain
// text where there isn't — rather than an always-on "Read more" that goes
// nowhere on the entries nobody has found a URL for yet.
function PanelRow({ panel }) {
  const label = (
    <>
      {panel.agency && <span className="gp-row__agency">{panel.agency} – </span>}
      <span className="gp-row__name">{panel.name}</span>
      {/* Non-breaking space before the bracket so a reference never wraps off
          on its own line, orphaned from the panel it identifies. */}
      {panel.reference && <span className="gp-row__ref">&nbsp;({panel.reference})</span>}
    </>
  );

  return (
    <li className="gp-row">
      <span className="gp-row__mark" aria-hidden="true" />
      {panel.sourceUrl ? (
        <a
          className="gp-row__link"
          href={panel.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>
      ) : (
        <span className="gp-row__text">{label}</span>
      )}
    </li>
  );
}
