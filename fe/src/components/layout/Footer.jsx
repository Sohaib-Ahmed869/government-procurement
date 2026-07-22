import { useLocation } from 'react-router-dom';
import logo from '../../assets/images/GovProcurementLogo.png';
import { useAudience } from '../../context/AudienceContext.jsx';
import { AUDIENCE } from '../../constants/audiences.js';
import SubscribeForm from '../forms/SubscribeForm.jsx';
import './Footer.css';

const LINK_COLUMNS = [
  {
    heading: 'Government Procurement',
    links: [
      { label: 'Courses', href: '/courses' },
      { label: 'Resources', href: '/resources' },
      { label: 'Videos', href: '/videos' },
      { label: 'FAQ', href: '/faq' },
      { label: 'About', href: '/about' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
  {
    heading: 'Award Contracts',
    links: [
      { label: 'Home', href: '/?audience=award' },
      { label: 'Advisory', href: '/advisory?audience=award' },
    ],
  },
  {
    heading: 'Win Contracts',
    links: [
      { label: 'Home', href: '/?audience=win' },
      { label: 'Advisory', href: '/advisory?audience=win' },
    ],
  },
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
    { label: 'Resources', href: '/resources' },
    { label: 'Advisory', href: '/advisory' },
    { label: 'Expertise', href: '/our-expertise' },
    { label: 'Courses', href: '/courses' },
  ],
  [
    { label: 'Forum', href: '/forum' },
    { label: 'Explore Tender Websites', href: '/tender-portals' },
    { label: 'Contact', href: '/contact' },
  ],
  [
    { label: 'Videos', href: '/videos' },
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ],
];

// Pages that carry the win/award toggle — the only place the win-only
// "Explore Tender Websites" link is relevant.
const TOGGLE_PATHS = ['/', '/advisory'];

export default function Footer({ audience: audienceProp }) {
  const { audience: ctxAudience } = useAudience();
  const audience = audienceProp ?? ctxAudience;
  const { pathname } = useLocation();

  // The "Explore Tender Websites" link only makes sense to the Win Contracts
  // audience, and only on a page where they can actually switch segment (home /
  // advisory). Everywhere else it's filtered out of the mobile flat rows.
  const showTenderPortals = audience === AUDIENCE.WIN && TOGGLE_PATHS.includes(pathname);

  // Re-flow the remaining links into rows using the full layout's row sizes as
  // the target line lengths, so when the tender link is removed the links below
  // pull up to fill its line rather than leaving a short, gappy row.
  const links = FLAT_ROWS.flat().filter(
    ({ href }) => href !== '/tender-portals' || showTenderPortals,
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
            <img className="site-footer__logo" src={logo} alt="" width="21" height="23" />
            <span className="site-footer__wordmark">Government Procurement</span>
          </a>
          <p className="site-footer__blurb">
            For over two decades, we've helped top organisations worldwide transform
            procurement through platforms, training, and consulting.
          </p>
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
      </div>
    </footer>
  );
}
