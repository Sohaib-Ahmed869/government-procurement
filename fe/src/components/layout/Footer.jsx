import logo from '../../assets/images/GovProcurementLogo.png';
import { useAudience } from '../../context/AudienceContext.jsx';
import SubscribeForm from '../forms/SubscribeForm.jsx';
import './Footer.css';

const LINK_COLUMNS = [
  {
    heading: 'Government Procurement',
    links: [
      { label: 'Courses', href: '/courses' },
      { label: 'Resources', href: '/resources' },
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
    { label: 'Explore Tender Websites', href: '/aus-list' },
    { label: 'Contact', href: '/contact' },
  ],
  [
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ],
];

// Official social profiles. Kept in sync with the `social` block seeded into
// site Settings (settings.social) so the CMS and footer show the same links.
const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/govprocurement/?hl=en',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61585039209265',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M14.5 7.7h-1.7c-1 0-1.6.6-1.6 1.7v1.5m-1.6 0h4.5m-2.9 0V17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/governmentprocurement/',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M7 10.5V17M7 7.4v.01M10.5 17v-3.6c0-1.4.9-2.4 2.2-2.4s2.3 1 2.3 2.4V17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@GovernmentProcurement',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10.5 9.2v5.6l4.8-2.8-4.8-2.8Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@govprocurement',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          d="M13.5 3.5v9.8a3.2 3.2 0 1 1-2.4-3.1M13.5 6.2A4.7 4.7 0 0 0 18 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'Threads',
    href: 'https://www.threads.com/@govprocurement',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.756-.513-.58-1.308-.876-2.359-.883h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.32.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.036-11.35c-.244 0-.494.006-.75.019-1.887.106-3.06.966-2.993 2.19.07 1.276 1.472 1.87 2.842 1.796 1.257-.068 2.902-.559 3.183-3.673a10.99 10.99 0 0 0-2.282-.332Z"
        />
      </svg>
    ),
  },
];

export default function Footer({ audience: audienceProp }) {
  const { audience: ctxAudience } = useAudience();
  const audience = audienceProp ?? ctxAudience;

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
            <img className="site-footer__logo" src={logo} alt="" width="21" height="23" />
            <span className="site-footer__wordmark">Government Procurement</span>
          </a>
          <p className="site-footer__blurb">
            For over two decades, we've helped top organisations worldwide transform
            procurement through platforms, training, and consulting.
          </p>
          <ul className="site-footer__social" aria-label="Social media">
            {SOCIAL_LINKS.map(({ label, href, icon }) => (
              <li key={label}>
                <a
                  className="site-footer__social-link"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  {icon}
                </a>
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
      </div>
    </footer>
  );
}
