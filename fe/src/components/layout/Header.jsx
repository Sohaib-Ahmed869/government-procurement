import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/images/GovProcurementLogo.png';
import arrowOutward from '../../assets/icons/Arrow outward.png';
import { useAudience } from '../../context/AudienceContext.jsx';
import AudienceToggle from './AudienceToggle.jsx';
import './Header.css';

const NAV_LINKS = [
  { label: 'Advisory', href: '/advisory' },
  { label: 'Our Expertise', href: '/our-expertise' },
  { label: 'Courses', href: '/courses' },
  { label: 'Resources', href: '/resources' },
  { label: 'Forum', href: '/forum' },
  { label: 'Explore Tender Websites', href: '/aus-list' },
];

export default function Header({ showToggle = true, audience: audienceProp }) {
  const { audience: ctxAudience } = useAudience();
  const audience = audienceProp ?? ctxAudience;

  // "Explore Tender Websites" is shown to both audiences (Win and Award).
  const navLinks = NAV_LINKS;
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  // Lock background scroll while the mobile menu is open, and let Escape close it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Close the menu when the viewport grows past the mobile breakpoint, so the
  // scroll lock is released and the desktop nav takes over cleanly.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 861px)');
    const onChange = (e) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <header className="site-header" data-audience={audience}>
      <div className="site-header__inner">
        {/* aria-labels keep the accessible names when the wordmark / CTA label
            are hidden to save width on narrow desktop widths. */}
        <Link
          className="site-header__brand"
          to="/"
          onClick={closeMenu}
          aria-label="Government Procurement"
        >
          <img className="site-header__logo" src={logo} alt="" width="21" height="23" />
          <span className="site-header__wordmark">Government Procurement</span>
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          <ul className="site-header__nav-list">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link className="site-header__nav-link" to={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__actions">
          {/* The magnifier goes straight to the search page — no inline field. */}
          <Link className="site-header__search-btn" to="/search" aria-label="Search the site">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>

          {showToggle && <AudienceToggle />}

          <a
            className="site-header__cta"
            href="/book-a-consultation"
            aria-label="Book a Consultation"
          >
            <span className="site-header__cta-label">Book a Consultation</span>
            <span className="site-header__cta-arrow">
              <img src={arrowOutward} alt="" />
            </span>
          </a>
        </div>

        {/* Mobile-only pair: the magnifier goes straight to the search page,
            so the menu itself carries no search field. */}
        <div className="site-header__mobile-actions">
          <Link
            className="site-header__mobile-search-link"
            to="/search"
            aria-label="Search the site"
            onClick={closeMenu}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>

          <button
            type="button"
            className={`site-header__burger${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="site-header__burger-line" />
            <span className="site-header__burger-line" />
            <span className="site-header__burger-line" />
          </button>
        </div>
      </div>

      {/* The toggle sits in the top bar on desktop; on mobile the bar only has
          room for the logo, search and hamburger, so it moves to its own row
          directly beneath — on every page, the way the homepage hero used to
          carry it. */}
      {showToggle && (
        <div className={`site-header__toggle-row${menuOpen ? ' is-hidden' : ''}`}>
          <AudienceToggle />
        </div>
      )}

      <div
        id="site-mobile-menu"
        className={`site-header__mobile${menuOpen ? ' is-open' : ''}`}
      >
        <nav className="site-header__mobile-nav" aria-label="Mobile">
          <ul className="site-header__mobile-list">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link className="site-header__mobile-link" to={href} onClick={closeMenu}>
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <a
                className="site-header__mobile-link site-header__mobile-cta"
                href="/book-a-consultation"
                onClick={closeMenu}
              >
                Book a Consultation
                <span className="site-header__cta-arrow">
                  <img src={arrowOutward} alt="" />
                </span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
