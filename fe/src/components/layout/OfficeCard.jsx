import { Link } from 'react-router-dom';
import {
  CONTACT_ADDRESS_LINES,
  CONTACT_CITY,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_HREF,
} from '../../constants/contact.js';
import './OfficeCard.css';

// The head office card that sits beside "Stay across procurement", as in the
// concept (fe/homepage-v2/index.html, `.office`).
//
// Every value comes from constants/contact.js, the same source the footer's
// contact column reads, so the address can only ever be changed in one place.
export default function OfficeCard() {
  return (
    <div className="office-card">
      <p className="office-card__label">Head Office</p>
      <h3 className="office-card__city">{CONTACT_CITY}</h3>

      <address className="office-card__address">
        {CONTACT_ADDRESS_LINES.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>

      <p className="office-card__rows">
        <a href={CONTACT_PHONE_HREF}>{CONTACT_PHONE}</a>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <Link className="office-card__cta" to="/book-a-consultation">
        Request a Consultation <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
