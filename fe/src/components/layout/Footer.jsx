import { useState } from 'react';
import { AiFillTikTok } from 'react-icons/ai';
import { FaFacebookF, FaLinkedin, FaThreads, FaYoutube } from 'react-icons/fa6';
import { TbBrandInstagramFilled } from 'react-icons/tb';
import logo from '../../assets/icons/GPLogo.png';
import { useAudience } from '../../context/AudienceContext.jsx';
import SubscribeForm from '../forms/SubscribeForm.jsx';
import WeChatQrDialog from './WeChatQrDialog.jsx';
import './Footer.css';

// The two segment columns carry the header nav, with Home ahead of it and the
// consultation CTA after. Labels and hrefs match Header.jsx's NAV_LINKS — keep
// them in step by hand when a nav item changes. Careers is the one nav item left
// out: it isn't audience-specific, so it sits in the company column below.
const AUDIENCE_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Capabilities', href: '/advisory' },
  { label: 'Our team', href: '/our-team' },
  { label: 'Courses', href: '/courses' },
  { label: 'Insights', href: '/resources' },
  { label: 'QnA', href: '/forum' },
  { label: 'Tender websites', href: '/aus-list' },
  { label: 'Book a consultation', href: '/book-a-consultation' },
];

// Every link in a segment column is tagged with that segment, so following one
// lands the visitor on the matching variant of the page.
function audienceColumn(heading, audience) {
  return {
    heading,
    links: AUDIENCE_LINKS.map(({ label, href }) => ({
      label,
      href: `${href}?audience=${audience}`,
    })),
  };
}

const LINK_COLUMNS = [
  {
    heading: 'Government Procurement',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
  audienceColumn('Award Contracts', 'award'),
  audienceColumn('Win Contracts', 'win'),
];

// On small screens the headed columns collapse into a flat run of links, laid
// out as three fixed rows (2 / 4 / 3). The rows are explicit rather than
// wrap-driven so the grouping holds at every width; the CSS scales the type
// down so each row still fits on one line.
const FLAT_ROWS = [
  [
    { label: 'Award Contracts', href: '/?audience=award' },
    { label: 'Win Contracts', href: '/?audience=win' },
  ],
  [
    { label: 'Insights', href: '/resources' },
    { label: 'Capabilities', href: '/advisory' },
    { label: 'Our team', href: '/our-team' },
    { label: 'Courses', href: '/courses' },
  ],
  [
    { label: 'QnA', href: '/forum' },
    { label: 'Tender websites', href: '/aus-list' },
    { label: 'Book a consultation', href: '/book-a-consultation' },
  ],
  [
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ],
];

// Head office contact details. The phone number is the same one the WhatsApp
// buttons across the site use (see ContactSection's CONTACT_METHODS).
const CONTACT_PHONE = '+61 478 669 922';
const CONTACT_EMAIL = 'mkheir@govprocurement.com.au';
const CONTACT_ADDRESS = '25 Restwell Street Bankstown NSW 2200';

// CONTACT_PHONE in the form the messaging deep links want: digits only, no
// leading "+".
const CONTACT_PHONE_DIGITS = CONTACT_PHONE.replace(/\D/g, '');

// The Facebook profile ID from SOCIAL_LINKS below — m.me deep-links by account
// ID, not by phone number, and this is the same account.
const FACEBOOK_ID = '61585039209265';

// Messaging apps the number above is reachable on. Each link opens its own app.
// WhatsApp and Telegram publish number-based deep links, so those open a chat
// with CONTACT_PHONE directly; Messenger opens the Facebook account.
//
// WeChat has no public https profile URL for personal accounts, so this entry
// opens a dialog with the account's own QR code for the visitor to scan in
// WeChat (Discover → Scan) rather than navigating anywhere. The image lives in
// WeChatQrDialog — to replace it, export a fresh code from the account
// (Me → name → My QR Code → Save) over src/assets/images/WeChatQr.png.
const CALL_CHANNELS = [
  { label: 'WhatsApp', href: `https://wa.me/${CONTACT_PHONE_DIGITS}` },
  { label: 'Telegram', href: `https://t.me/+${CONTACT_PHONE_DIGITS}` },
  { label: 'WeChat', qr: true },
  { label: 'FB Messenger', href: `https://m.me/${FACEBOOK_ID}` },
  { label: 'Botim', href: 'https://www.botim.me/' }, // TODO: Botim profile
];

// Official social profiles. Kept in sync with the `social` block seeded into
// site Settings (settings.social) so the CMS and footer show the same links.
// Icons are the brand marks from react-icons, drawn in the link colour.
const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/govprocurement/?hl=en',
    Icon: TbBrandInstagramFilled,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61585039209265',
    Icon: FaFacebookF,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/governmentprocurement/',
    Icon: FaLinkedin,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@GovernmentProcurement',
    Icon: FaYoutube,
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@govprocurement',
    Icon: AiFillTikTok,
  },
  {
    label: 'Threads',
    href: 'https://www.threads.com/@govprocurement',
    Icon: FaThreads,
  },
];

export default function Footer({ audience: audienceProp }) {
  const { audience: ctxAudience } = useAudience();
  const audience = audienceProp ?? ctxAudience;

  // Whether the WeChat QR dialog is showing.
  const [qrOpen, setQrOpen] = useState(false);

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
      <div className="site-footer__subscribe">
        <SubscribeForm />
      </div>
      <div className="site-footer__inner">
        <div className="site-footer__brand-col">
          <a className="site-footer__brand" href="/">
            {/* Source is 738×640; height drives the size, width follows. */}
            <img className="site-footer__logo" src={logo} alt="" width="26" height="23" />
            <span className="site-footer__wordmark">Government Procurement</span>
          </a>
          <p className="site-footer__blurb">
            For over two decades, we've helped top organisations worldwide transform
            procurement through platforms, training, and consulting.
          </p>
          <h2 className="site-footer__social-heading" id="footer-social-heading">
            Follow us
          </h2>
          <ul className="site-footer__social" aria-labelledby="footer-social-heading">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
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
            Call us
          </h2>
          <ul className="site-footer__channels" aria-labelledby="footer-channels-heading">
            {CALL_CHANNELS.map(({ label, href, qr }) => (
              <li key={label}>
                {qr ? (
                  <button
                    type="button"
                    className="site-footer__channel-link site-footer__channel-button"
                    onClick={() => setQrOpen(true)}
                  >
                    {label}
                  </button>
                ) : (
                  <a
                    className="site-footer__channel-link"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <nav className="site-footer__links" aria-label="Footer">
          {LINK_COLUMNS.map(({ heading, links }) => (
            <div className="site-footer__col" key={heading}>
              <h2 className="site-footer__heading">{heading}</h2>
              <ul className="site-footer__list">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a className="site-footer__link" href={href}>
                      {label}
                    </a>
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
                  <a className="site-footer__link" href={href}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </nav>

        {/* Head office details, sitting to the right of the link columns. Kept
            outside the <nav> above so it survives the ≤760px breakpoint, where
            the headed columns give way to the flat link run. */}
        <address className="site-footer__contact">
          <h2 className="site-footer__contact-heading">
            <a className="site-footer__contact-heading-link" href="/contact">
              Contact us
            </a>
          </h2>
          <p className="site-footer__contact-sub">Head Office</p>
          <hr className="site-footer__contact-rule" />
          <ul className="site-footer__contact-list">
            <li>{CONTACT_ADDRESS}</li>
            <li>
              T :{' '}
              <a className="site-footer__contact-link" href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}>
                {CONTACT_PHONE}
              </a>
            </li>
            <li>
              <a className="site-footer__contact-link" href={`mailto:${CONTACT_EMAIL}`}>
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
