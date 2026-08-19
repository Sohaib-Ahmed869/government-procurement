import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { JURISDICTIONS } from '../../jurisdictions/data.js';
import './JurisdictionsBand.css';

// Every jurisdiction, each one a way into the rules page filtered to it.
//
// The list is imported rather than restated — it is the same set the
// Jurisdictional Links page and the CMS both work from (features/jurisdictions/
// data.js, kept in step with RULE_STATES on the server), so a jurisdiction can
// only ever be added in one place.
export default function JurisdictionsBand() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      id="jurisdictional-links"
      className={`hm-band hm-band--dark${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="home-jurisdictions-title"
    >
      <div className="hm-shell hm-band__head hm-reveal">
        <h2 className="hm-band__title" id="home-jurisdictions-title">
          The rules, jurisdiction by jurisdiction
        </h2>
        <p className="hm-band__lede">
          Legislation, policy, thresholds and panels for the Commonwealth and every state
          and territory, collected in one place and kept current.
        </p>
      </div>

      <div className="hm-shell">
        <ul className="jb__grid">
          {JURISDICTIONS.map(({ value, label }) => (
            <li className="jb__item hm-reveal" key={value}>
              <Link className="jb__link" to={`/jurisdictional-links?state=${value}`}>
                <span className="jb__code">{value}</span>
                <span className="jb__label">{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <Link className="hm-arrow" to="/jurisdictional-links">
          See all jurisdictional links <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
