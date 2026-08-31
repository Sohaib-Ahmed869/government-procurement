import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/icons/gp-02.svg';
import { useAudience } from '../../context/AudienceContext.jsx';
import { useScrollSpy } from '../../hooks/useScrollSpy.js';
import {
  HOME_SECTION_IDS,
  HOME_SECTIONS_ENABLED,
  SECTION_BY_NAV_LABEL,
} from '../../features/home/sections.js';
import { bidWritersPublic } from '../../config/features.js';
import AudienceToggle from './AudienceToggle.jsx';
import './Header.css';

// Labels are title case: every word is capitalised.
//
// `match` lists the paths that should light this item up, for the pages that
// answer to more than one route (see App.jsx). It defaults to `href` alone, and
// child paths always count — /courses/:id keeps Courses lit.
const NAV_LINKS = [
  // A5: "Capabilities" is now "Service Offering", here and everywhere else.
  // /capabilities still resolves (App.jsx redirects it) so old links hold, and
  // it stays in `match` so the item lights up if someone arrives on it.
  {
    label: 'Service Offering',
    href: '/service-offering',
    match: ['/service-offering', '/capabilities'],
  },
  // Our Expertise is off the nav while Our Team is trialled in its place. The
  // page, route and components all still exist — restore this line to bring the
  // link back.
  // { label: 'Our Expertise', href: '/our-expertise' },
  { label: 'Our Team', href: '/our-team' },
  { label: 'Courses', href: '/courses' },
  // /insights covers the listing and /insights/:slug for a single article.
  { label: 'Insights', href: '/insights' },
  { label: 'Q&A', href: '/q-and-a' },
  // One page, three routes.
  {
    label: 'Tender Websites',
    href: '/aus-list',
    match: ['/aus-list', '/featured-list', '/tender-portals'],
  },
  // A6: the Sourcing Advisor, sitting with the reference pages below rather
  // than up beside Service Offering — it is a tool a visitor comes back to, not
  // an introduction to the firm.
  { label: 'Sourcing Advisor', href: '/advisory' },
  { label: 'Jurisdictional Links', href: '/jurisdictional-links' },
  // B2. Sits next to Jurisdictional Links because the two are the site's
  // reference pages and a visitor looking for one often wants the other.
  // There is no homepage band for it, so on the homepage this one navigates
  // rather than scrolling — scrollToSection falls through when the section
  // isn't on the page.
  //
  // The route stays /government-panels: the label is what the page is FOR, the
  // path is what it holds, and changing the URL would break every link already
  // published to it.
  { label: 'How to Engage Us', href: '/government-panels' },
  // B4 — the AI Prompt Library.
  { label: 'AI Prompt Library', href: '/prompt-library' },
  // B6 — the Templates library, on the top ribbon as the brief asks.
  { label: 'Templates', href: '/templates' },
  // B7.8 — only on the ribbon once the directory is live. On `preview` the page
  // works but must not be advertised; on `off` it does not exist.
  ...(bidWritersPublic ? [{ label: 'Find a Bid Writer', href: '/find-a-bid-writer' }] : []),
  // Last, and after the conditional above so it stays last whether or not the
  // bid-writer directory is switched on. It is the one item aimed at somebody
  // who wants to work here rather than to buy or bid.
  { label: 'Careers', href: '/careers' },
];

// Whether `pathname` is this nav item's page — an exact match, or anything
// beneath it (a course, an article, a team member, a forum sub-page).
function isCurrent(pathname, { href, match }) {
  return (match ?? [href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// A1 — on the homepage the ribbon scrolls rather than navigates.
//
// Smooth-scrolls to the section and writes the hash into the URL without a
// router navigation, so the page never unmounts and the back button still walks
// the sections. Falls through to the normal link when the section isn't on the
// page — which is what happens if a band renders null for want of content.
function scrollToSection(event, id, onDone) {
  const el = document.getElementById(id);
  if (!el) return; // let the browser follow the href

  event.preventDefault();
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Any close handler runs first — the mobile menu locks body scroll while it
  // is open, so scrolling before it is dismissed simply doesn't happen. The
  // scroll then waits a frame for the lock to actually be released.
  onDone?.();
  window.requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });

  window.history.pushState(null, '', `#${id}`);
}

export default function Header({ showToggle = true, audience: audienceProp }) {
  const { audience: ctxAudience } = useAudience();
  const audience = audienceProp ?? ctxAudience;

  // "Tender websites" is shown to both audiences (Win and Award).
  const navLinks = NAV_LINKS;
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // The ribbon behaves as anchors on the homepage and as routed links
  // everywhere else, so the spy only runs where there is something to spy on.
  //
  // HOME_SECTIONS_ENABLED is false while the homepage is just the hero and the
  // footer: with no bands to scroll to, every item routes to its own page
  // instead. Flipping that one flag back restores the scrolling ribbon.
  const onHome = HOME_SECTIONS_ENABLED && pathname === '/';
  const activeSection = useScrollSpy(HOME_SECTION_IDS, { enabled: onHome });

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
          {/* Vector, so it stays crisp at any screen density. Height drives the
              size and width follows; the attributes are only here to declare the
              ratio before it loads, and carry the viewBox's 176.68 × 153.19 as
              whole numbers. */}
          <img className="site-header__logo" src={logo} alt="" width="1153" height="1000" />
          <span className="site-header__wordmark">
            <span>Government</span>
            <span>Procurement</span>
          </span>
        </Link>

        <div className="site-header__actions">
          {showToggle && <AudienceToggle />}

          <Link
            className="site-header__cta"
            to="/book-a-consultation"
            aria-label="Request a Consultation"
          >
            <span className="site-header__cta-label">Request a Consultation</span>
          </Link>

          {/* The way into the learning platform.

              Before the LMS existed, the only path to /learn was a course page's
              Enrol button — so a learner who already had an account and simply
              wanted to get back to it had nowhere on the site to click.

              It wears .site-header__cta, so it is the same control as the button
              to its left rather than a lookalike built beside it — one rule to
              change when the bar's fill, height or type moves. Its own class is
              only for what differs: it is sized to its label, because a fourth
              190px cell is what would push this row into wrapping. */}
          <Link className="site-header__cta site-header__login" to="/learn/login">
            Student Login
          </Link>
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

      <nav className="site-header__nav" aria-label="Primary">
        <ul className="site-header__nav-list">
          {navLinks.map((item) => {
            const section = onHome ? SECTION_BY_NAV_LABEL[item.label] : undefined;
            // On the homepage a section item is current when the visitor has
            // scrolled to it; everywhere else it's the route that decides.
            const current = section ? activeSection === section : isCurrent(pathname, item);
            const className = `site-header__nav-link${current ? ' is-current' : ''}`;

            return (
              <li key={item.href}>
                {section ? (
                  <a
                    className={className}
                    href={`#${section}`}
                    aria-current={current ? 'true' : undefined}
                    onClick={(e) => scrollToSection(e, section)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    className={className}
                    to={item.href}
                    aria-current={current ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* The toggle sits in the top bar on desktop; on mobile the bar only has
          room for the logo and hamburger, so it moves to its own row
          directly beneath — on every page, the way the homepage hero used to
          carry it. */}
      {showToggle && (
        <div className={`site-header__toggle-row${menuOpen ? ' is-hidden' : ''}`}>
          <AudienceToggle plain />
        </div>
      )}

      <div
        id="site-mobile-menu"
        className={`site-header__mobile${menuOpen ? ' is-open' : ''}`}
      >
        <nav className="site-header__mobile-nav" aria-label="Mobile">
          <ul className="site-header__mobile-list">
            {navLinks.map((item, i) => {
              const section = onHome ? SECTION_BY_NAV_LABEL[item.label] : undefined;
              const current = section ? activeSection === section : isCurrent(pathname, item);
              const className = `site-header__mobile-link${current ? ' is-current' : ''}`;

              return (
                // `--i` drives the open stagger. The delays used to be written
                // out by hand as :nth-child(1) … (10), and the menu has more
                // items than that — so everything past the tenth got no delay
                // at all and snapped in fully formed while the rest were still
                // arriving. Indexed here instead, so adding a nav item cannot
                // reintroduce it.
                <li key={item.href} style={{ '--i': i }}>
                  {section ? (
                    <a
                      className={className}
                      href={`#${section}`}
                      aria-current={current ? 'true' : undefined}
                      // Close first, then scroll: the menu locks body scroll
                      // while it is open, so scrolling underneath it goes
                      // nowhere until it has been dismissed.
                      onClick={(e) => scrollToSection(e, section, closeMenu)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      className={className}
                      to={item.href}
                      onClick={closeMenu}
                      aria-current={current ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
            {/* The two actions from the top bar, in the bar's order, after
                the nav items — so they carry the last two indices and arrive
                at the end of the stagger. */}
            <li style={{ '--i': navLinks.length }}>
              <Link
                className="site-header__mobile-link site-header__mobile-cta"
                to="/book-a-consultation"
                onClick={closeMenu}
              >
                Request a Consultation
              </Link>
            </li>
            <li style={{ '--i': navLinks.length + 1 }}>
              <Link
                className="site-header__mobile-link site-header__mobile-login"
                to="/learn/login"
                onClick={closeMenu}
              >
                Student Login
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
