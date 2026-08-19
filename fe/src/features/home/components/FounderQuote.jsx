import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import photo from '../../../assets/images/MainPictureHomepage.png';
import './FounderQuote.css';

// The team band, carried on the founder's own words.
//
// It sits on --gp-brand-alt rather than --gp-brand: the second dark step in the
// ramp, so this and the tender band above it are both dark without being the
// same dark. That is the "two distinguishable shades" of A4 doing visible work
// rather than living in a token file.
//
// The copy is deliberately audience-neutral — it is about who the advisers are,
// which doesn't change with the segment — so only the palette moves on toggle.
const QUOTE =
  'Our advisers have sat on both sides of the table, evaluating bids and writing them. That experience shapes practical guidance you can act on, not theory. Whether you are building capability across a procurement function or preparing a single high-stakes tender, we tailor our support to where you are and what you need to achieve.';

export default function FounderQuote() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      id="our-team"
      className={`hm-band hm-band--dark-2${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="home-team-title"
    >
      <div className="hm-shell">
        <div className="hm-split hm-split--reverse">
          <div className="hm-split__body hm-reveal">
            <h2 id="home-team-title">Advisers who have sat on both sides of the table</h2>

            <blockquote className="fq__quote">
              <p>{QUOTE}</p>
            </blockquote>

            <p className="fq__attribution">
              <span className="fq__name">Mohammed Kheir</span>
              <span className="fq__role">Founder, Government Procurement</span>
            </p>

            <Link className="hm-arrow" to="/our-team">
              Meet the team <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="hm-split__media hm-reveal" data-delay="1">
            <img src={photo} alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}
