import { Link } from 'react-router-dom';
import { JURISDICTIONS } from '../jurisdictions.js';
import Arrow from '../../../components/shared/Arrow.jsx';
import './JurisdictionPicker.css';

// A6 — the row of jurisdiction boxes, shared by the Sourcing Advisor's own
// picker and the homepage's advisory band.
//
// One component rather than two, because the two had drifted: the homepage
// named Victoria and Queensland as "coming soon" while jurisdictions.js listed
// only New South Wales, so the band was advertising two jurisdictions nobody
// has committed to. Reading the list from one place is what stops that
// happening again.
//
// Every jurisdiction is named. Only the ones with a rule pack behind them are
// links; the rest are inert cards saying when they arrive, which is more use to
// a visitor than an unnamed placeholder — they can see their own jurisdiction
// on the list and know it is coming.

// `showLogos` is off by default. The jurisdiction crest belongs to the tool's
// own picker, where the boxes are the page; the homepage band renders the same
// component at a glance and stays as it was.
export default function JurisdictionPicker({ itemClassName = '', showLogos = false }) {
  const item = `pa-grid__item${itemClassName ? ` ${itemClassName}` : ''}`;

  return (
    <ul className="pa-grid">
      {JURISDICTIONS.map(({ slug, code, name, note, live, logo }) => (
        <li className={item} key={slug}>
          {live ? (
            /* A real link, so it can be opened in a new tab and read by
               anything that collects the page's destinations — the tool is a
               page, not a mode the button switches the page into. */
            <Link className="pa-card is-live" to={`/advisory/${slug}`}>
              <span className="pa-card__code">{code}</span>
              <span className="pa-card__name">{name}</span>
              <span className="pa-card__status">{note}</span>
              <span className="pa-card__go">
                Start
                <Arrow className="pa-card__arrow" />
              </span>
              {/* Decorative: the name is already written beside it, so the
                  crest carries an empty alt rather than repeating it. */}
              {showLogos && logo && (
                <span className="pa-card__logo">
                  <img src={logo} alt="" loading="lazy" />
                </span>
              )}
            </Link>
          ) : (
            <div className="pa-card pa-card--soon" aria-disabled="true">
              <span className="pa-card__code">{code}</span>
              <span className="pa-card__name">{name}</span>
              <span className="pa-card__status">{note}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
