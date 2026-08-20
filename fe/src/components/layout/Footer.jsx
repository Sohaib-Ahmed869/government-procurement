import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import logo from '../../assets/icons/gp-02.svg';
import { linksApi } from '../../api';
import {
  CONTACT_ADDRESS_LINES,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_HREF,
} from '../../constants/contact.js';
import { resolveFooterLinks } from '../../constants/footerLinks.js';
import { useAudience } from '../../context/AudienceContext.jsx';
import SubscribeForm from '../forms/SubscribeForm.jsx';
import OfficeCard from './OfficeCard.jsx';
import WeChatQrDialog from './WeChatQrDialog.jsx';
import { bidWritersPublic } from '../../config/features.js';
import './Footer.css';

// The two segment columns carry the header nav, with Home ahead of it and the
// consultation CTA after. Labels and hrefs match Header.jsx's NAV_LINKS — keep
// them in step by hand when a nav item changes.
//
// `shared: true` marks a page with no win/award variant, so it is linked plainly
// rather than tagged with an audience it would ignore.
const AUDIENCE_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Service Offering', href: '/service-offering' },
  // The Procurement Advisor is one tool per jurisdiction, not a win/award
  // variant of a page, so it is linked plainly.
  { label: 'Advisory', href: '/advisory', shared: true },
  { label: 'Our Team', href: '/our-team' },
  { label: 'Courses', href: '/courses' },
  { label: 'Insights', href: '/insights' },
  { label: 'Q&A', href: '/q-and-a' },
  { label: 'Tender Websites', href: '/aus-list' },
  { label: 'Careers', href: '/careers', shared: true },
  { label: 'Jurisdictional Links', href: '/jurisdictional-links', shared: true },
  // B2. The list itself is the same under both segments — what differs is the
  // reason to read it, which the page's own lede handles — so it is linked
  // plainly rather than tagged with an audience it would ignore.
  { label: 'Government Panels', href: '/government-panels', shared: true },
  // B4. The library is filtered by topic on the page itself, so the audience
  // toggle has nothing to add to the link.
  { label: 'Prompt Library', href: '/prompt-library', shared: true },
  { label: 'Templates', href: '/templates', shared: true },
  // B7.8 — footer entry appears with the nav entry, at `live` only.
  ...(bidWritersPublic ? [{ label: 'Find a Bid Writer', href: '/find-a-bid-writer', shared: true }] : []),
  { label: 'Request a Consultation', href: '/book-a-consultation' },
];

// Every audience-specific link in a segment column is tagged with that segment,
// so following one lands the visitor on the matching variant of the page.
function audienceColumn(heading, audience) {
  return {
    heading,
    links: AUDIENCE_LINKS.map(({ label, href, shared }) => ({
      label,
      href: shared ? href : `${href}?audience=${audience}`,
    })),
  };
}

// Left to right across the row: the brand column carries the Government
// Procurement wordmark, then the two segments, then Policies last.
const LINK_COLUMNS = [
  audienceColumn('Award Contracts', 'award'),
  audienceColumn('Win Contracts', 'win'),
  {
    heading: 'Policies',
    links: [
      { label: 'Privacy', href: '/policies/privacy' },
      { label: 'Terms', href: '/policies/terms' },
      { label: 'Conflicts of Interest', href: '/policies/conflicts-of-interest' },
      { label: 'All policies', href: '/policies' },
    ],
  },
];

// On small screens the headed columns collapse into a flat run of links, laid
// out as five fixed rows (2 / 4 / 3 / 2 / 4). The rows are explicit rather than
// wrap-driven so the grouping holds at every width; the CSS scales the type
// down so each row still fits on one line.
//
// Rows are balanced by rendered width, not link count — the font-size divisor in
// Footer.css is calibrated to the widest row, so a row much longer than the rest
// shrinks the type for all of them. Keep new rows near the others in length.
const FLAT_ROWS = [
  [
    { label: 'Award Contracts', href: '/?audience=award' },
    { label: 'Win Contracts', href: '/?audience=win' },
  ],
  [
    { label: 'Insights', href: '/insights' },
    { label: 'Service Offering', href: '/service-offering' },
    { label: 'Our Team', href: '/our-team' },
    { label: 'Courses', href: '/courses' },
  ],
  [
    { label: 'Q&A', href: '/q-and-a' },
    { label: 'Advisory', href: '/advisory' },
    { label: 'Tender Websites', href: '/aus-list' },
    { label: 'Careers', href: '/careers' },
  ],
  [
    { label: 'Jurisdictional Links', href: '/jurisdictional-links' },
    { label: 'Government Panels', href: '/government-panels' },
    { label: 'Prompt Library', href: '/prompt-library' },
    { label: 'Templates', href: '/templates' },
    ...(bidWritersPublic ? [{ label: 'Find a Bid Writer', href: '/find-a-bid-writer' }] : []),
    { label: 'Request a Consultation', href: '/book-a-consultation' },
  ],
  [
    { label: 'Privacy', href: '/policies/privacy' },
    { label: 'Terms', href: '/policies/terms' },
    { label: 'Conflicts of Interest', href: '/policies/conflicts-of-interest' },
  ],
];

// Internal links go through the router; anything else stays a plain anchor.
//
// Every link in these lists used to be a bare <a href>, which made each one a
// full page load: the SPA was torn down and rebuilt, and the first-load overlay
// (SiteLoader) played on the way in. Clicking "Privacy" in the footer showed the
// loading animation before the page it had already been on finished unmounting.
//
// A footer link is a same-app navigation and should behave like one. External,
// mailto: and tel: hrefs are not, so they keep the anchor.
function FooterLink({ href, className, children }) {
  if (!href.startsWith('/')) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={href}>
      {children}
    </Link>
  );
}

// `showContactBand` drops the paper band above the dark footer — the head
// office card and the "Remain Connected" form together. Off on the homepage,
// which is currently the hero and the footer and nothing else: the dark footer
// below already carries the same address, phone and email, so the band was
// saying it twice on a page with nothing between them. Every other page keeps
// it, where there is a page's worth of content in between.
export default function Footer({ audience: audienceProp, showContactBand = true }) {
  const { audience: ctxAudience } = useAudience();
  const audience = audienceProp ?? ctxAudience;

  // Whether the WeChat QR dialog is showing.
  const [qrOpen, setQrOpen] = useState(false);

  // Saved links from the CMS override the catalogue's built-in addresses. The
  // footer renders from the catalogue either way, so a failed or empty fetch
  // simply leaves the shipped links in place.
  const [savedLinks, setSavedLinks] = useState([]);
  useEffect(() => {
    let alive = true;
    linksApi
      // `all: 1` so links switched off in the CMS still come back — the footer
      // needs to see one to leave it out. Without it the API filters them away,
      // and resolveFooterLinks falls back to the built-in link instead.
      .list({ group: 'social', all: 1 })
      .then((list) => {
        if (alive) setSavedLinks(list || []);
      })
      .catch(() => {
        /* keep the built-in links */
      });
    return () => {
      alive = false;
    };
  }, []);

  const socialLinks = resolveFooterLinks('social', savedLinks);
  const channelLinks = resolveFooterLinks('channel', savedLinks);

  // "Explore Tender Websites" is shown to both audiences (Win and Award).
  const showTenderPortals = true;

  // Re-flow the remaining links into rows using the full layout's row sizes as
  // the target line lengths, so when the tender link is removed the links below
  // pull up to fill its line rather than leaving a short, gappy row.
  const links = FLAT_ROWS.flat().filter(
    ({ href }) => href !== '/aus-list' || showTenderPortals,
  );
  const flatRows = [];
  let cursor = 0;
  for (const size of FLAT_ROWS.map((row) => row.length)) {
    if (cursor >= links.length) break;
    flatRows.push(links.slice(cursor, cursor + size));
    cursor += size;
  }

  return (
    <footer className="site-footer" data-audience={audience}>
      {/* The concept's contact band: head office on the left, subscribe on the
          right, on a paper band above the dark footer proper. */}
      {showContactBand ? (
        <div className="site-footer__subscribe">
          <div className="site-footer__subscribe-inner">
            <OfficeCard />
            <SubscribeForm />
          </div>
        </div>
      ) : null}
      <div className="site-footer__inner">
        <div className="site-footer__brand-col">
          <Link className="site-footer__brand" to="/">
            {/* Vector, so it stays crisp at any screen density. Height drives
                the size and width follows; the attributes are only here to
                declare the ratio before it loads, and carry the viewBox's
                176.68 × 153.19 as whole numbers. */}
            <img className="site-footer__logo" src={logo} alt="" width="1153" height="1000" />
            <span className="site-footer__wordmark">Government Procurement</span>
          </Link>
          <h2 className="site-footer__social-heading" id="footer-social-heading">
            Follow Us
          </h2>
          <ul className="site-footer__social" aria-labelledby="footer-social-heading">
            {socialLinks.map(({ platform, label, href, Icon }) => (
              <li key={platform}>
                <a
                  className="site-footer__social-link"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  <Icon className="site-footer__social-icon" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>

          <h2 className="site-footer__social-heading" id="footer-channels-heading">
            Contact
          </h2>
          <ul className="site-footer__channels" aria-labelledby="footer-channels-heading">
            {channelLinks.map(({ platform, label, href, qr, Icon, iconModifier }) => {
              const iconClass = `site-footer__channel-icon${
                iconModifier ? ` site-footer__channel-icon--${iconModifier}` : ''
              }`;
              return (
                <li key={platform}>
                  {qr ? (
                    <button
                      type="button"
                      className="site-footer__channel-link site-footer__channel-button"
                      onClick={() => setQrOpen(true)}
                      aria-label={label}
                      title={label}
                    >
                      <Icon className={iconClass} aria-hidden="true" />
                    </button>
                  ) : (
                    <a
                      className="site-footer__channel-link"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                    >
                      <Icon className={iconClass} aria-hidden="true" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          {/* The number itself isn't repeated here — it's listed once, under
              "Contact Us" on the right of the row. */}
        </div>

        <nav className="site-footer__links" aria-label="Footer">
          {LINK_COLUMNS.map(({ heading, links }) => (
            <div className="site-footer__col" key={heading}>
              <h2 className="site-footer__heading">{heading}</h2>
              <hr className="site-footer__rule" />
              <ul className="site-footer__list">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <FooterLink className="site-footer__link" href={href}>
                      {label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <nav className="site-footer__flat" aria-label="Footer">
          {flatRows.map((row) => (
            <ul className="site-footer__flat-row" key={row[0].label}>
              {row.map(({ label, href }) => (
                <li key={label}>
                  <FooterLink className="site-footer__link" href={href}>
                    {label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          ))}
        </nav>

        {/* Head office details, sitting to the right of the link columns. Kept
            outside the <nav> above so it survives the ≤760px breakpoint, where
            the headed columns give way to the flat link run. */}
        <address className="site-footer__contact">
          <h2 className="site-footer__contact-heading">Contact Us</h2>
          <hr className="site-footer__rule" />
          {/* Each detail is introduced by its own label, so the block reads the
              same way whether or not the address wraps. */}
          <ul className="site-footer__contact-list">
            <li>
              <span className="site-footer__contact-label">Head Office:</span>
              {CONTACT_ADDRESS_LINES.map((line) => (
                <span key={line}>
                  <br />
                  {line}
                </span>
              ))}
            </li>
            <li>
              {/* Short enough to share its label's line — the address and email
                  are not, so they keep the value on the line beneath. */}
              <span className="site-footer__contact-label">Contact Number:</span>{' '}
              <a
                className="site-footer__contact-link site-footer__contact-phone"
                href={CONTACT_PHONE_HREF}
              >
                {CONTACT_PHONE}
              </a>
            </li>
            <li>
              <span className="site-footer__contact-label">Email Address:</span>
              <br />
              <a
                className="site-footer__contact-link site-footer__contact-email"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </address>
      </div>

      <WeChatQrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </footer>
  );
}
