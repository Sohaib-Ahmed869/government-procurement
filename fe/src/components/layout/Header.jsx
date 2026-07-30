import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/icons/GPLogo.png';
import { useAudience } from '../../context/AudienceContext.jsx';
import AudienceToggle from './AudienceToggle.jsx';
import './Header.css';

// Labels are sentence case: only the first word is capitalised.
//
// `match` lists the paths that should light this item up, for the pages that
// answer to more than one route (see App.jsx). It defaults to `href` alone, and
// child paths always count — /courses/:id keeps Courses lit.
const NAV_LINKS = [
  { label: 'Capabilities', href: '/capabilities' },
  // Our Expertise is off the nav while Our Team is trialled in its place. The
  // page, route and components all still exist — restore this line to bring the
  // link back.
  // { label: 'Our expertise', href: '/our-expertise' },
  { label: 'Our team', href: '/our-team' },
  { label: 'Courses', href: '/courses' },
  // /insights covers the listing and /insights/:slug for a single article.
  { label: 'Insights', href: '/insights' },
  { label: 'QnA', href: '/qna' },
  // One page, three routes.
  {
    label: 'Tender websites',
    href: '/aus-list',
    match: ['/aus-list', '/featured-list', '/tender-portals'],
  },
  { label: 'Careers', href: '/careers' },
  { label: 'Jurisdictional links', href: '/jurisdictional-links' },
];

// Whether `pathname` is this nav item's page — an exact match, or anything
// beneath it (a course, an article, a team member, a forum sub-page).
function isCurrent(pathname, { href, match }) {
  return (match ?? [href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function Header({ showToggle = true, audience: audienceProp }) {
  const { audience: ctxAudience } = useAudience();
  const audience = audienceProp ?? ctxAudience;

  // "Tender websites" is shown to both audiences (Win and Award).
  const navLinks = NAV_LINKS;
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

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

  // Mobile: the bar is sticky, and once the page has scrolled past the top it
  // sheds the audience toggle row (see .is-stuck in Header.css). Only the
  // threshold crossing sets state, so this doesn't re-render on every scroll.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <header
      className={`site-header${stuck ? ' is-stuck' : ''}`}
      data-audience={audience}
    >
      <div className="site-header__inner">
        {/* aria-labels keep the accessible names when the wordmark / CTA label
            are hidden to save width on narrow desktop widths. */}
        <Link
          className="site-header__brand"
          to="/"
          onClick={closeMenu}
          aria-label="Government Procurement"
        >
          {/* Source is 738×640; height drives the size, width follows. */}
          <img className="site-header__logo" src={logo} alt="" width="26" height="23" />
          <span className="site-header__wordmark">Government Procurement</span>
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          <ul className="site-header__nav-list">
            {navLinks.map((item) => {
              const current = isCurrent(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    className={`site-header__nav-link${current ? ' is-current' : ''}`}
                    to={item.href}
                    aria-current={current ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="site-header__actions">
          {showToggle && <AudienceToggle />}

          <a
            className="site-header__cta"
            href="/book-a-consultation"
            aria-label="Book a consultation"
          >
            <span className="site-header__cta-label">Book a consultation</span>
          </a>
        </div>

        {/* Mobile-only: the hamburger that opens the menu. */}
        <div className="site-header__mobile-actions">
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
          room for the logo and hamburger, so it moves to its own row
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
            {navLinks.map((item) => {
              const current = isCurrent(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    className={`site-header__mobile-link${current ? ' is-current' : ''}`}
                    to={item.href}
                    onClick={closeMenu}
                    aria-current={current ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <a
                className="site-header__mobile-link site-header__mobile-cta"
                href="/book-a-consultation"
                onClick={closeMenu}
              >
                Book a consultation
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
