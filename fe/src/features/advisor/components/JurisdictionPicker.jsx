import { Link } from 'react-router-dom';
import { JURISDICTIONS, PICKER_SLOTS } from '../jurisdictions.js';
import './JurisdictionPicker.css';

// A6 — the row of jurisdiction boxes, shared by the Procurement Advisor's own
// picker and the homepage's advisory band.
//
// One component rather than two, because the two had drifted: the homepage
// named Victoria and Queensland as "coming soon" while jurisdictions.js listed
// only New South Wales, so the band was advertising two jurisdictions nobody
// has committed to. Reading the list from one place is what stops that
// happening again — ship a pack, add it to JURISDICTIONS, and both surfaces
// pick it up.
//
// Every entry in JURISDICTIONS is live; the ones that aren't simply aren't
// listed. The rest of the row is filled with unnamed placeholders, deliberately
// unnamed: which jurisdiction comes next has not been decided, and putting a
// name on a box is a promise about it.
export default function JurisdictionPicker({ itemClassName = '' }) {
  const soon = Math.max(0, PICKER_SLOTS - JURISDICTIONS.length);
  const item = `pa-grid__item${itemClassName ? ` ${itemClassName}` : ''}`;

  return (
    <ul className="pa-grid">
      {JURISDICTIONS.map(({ slug, code, name, note }) => (
        <li className={item} key={code}>
          {/* A real link, so it can be opened in a new tab and read by anything
              that collects the page's destinations — the tool is a page, not a
              mode the button switches the page into. */}
          <Link className="pa-card is-live" to={`/advisory/${slug}`}>
            <span className="pa-card__code" aria-hidden="true">{code}</span>
            <span className="pa-card__name">{name}</span>
            <span className="pa-card__status">{note}</span>
            <span className="pa-card__go">Start <span aria-hidden="true">→</span></span>
          </Link>
        </li>
      ))}

      {Array.from({ length: soon }, (_, i) => (
        <li className={item} key={`soon-${i}`}>
          <div className="pa-card pa-card--soon" aria-disabled="true">
            <span className="pa-card__name">Coming soon</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
