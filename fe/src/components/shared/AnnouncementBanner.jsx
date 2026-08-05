import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../context/AudienceContext.jsx';
import { announcementsApi } from '../../api';
import './AnnouncementBanner.css';

// Thin site-wide banner driven by the CMS (the active announcement). Not
// dismissible — it stays for as long as the CMS keeps it active, so whether a
// visitor sees it is an editor's decision rather than theirs.
export default function AnnouncementBanner() {
  const { audience } = useAudience();
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let alive = true;
    announcementsApi
      .active()
      .then((b) => {
        if (alive && b) setBanner(b);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!banner) return null;

  const isInternal = banner.link && banner.link.startsWith('/');

  return (
    <div className="announce" data-audience={audience} role="region" aria-label="Site announcement">
      <p className="announce__msg">
        {banner.message}
        {banner.link &&
          (isInternal ? (
            <Link className="announce__link" to={banner.link}>
              {banner.linkLabel || 'Learn more'}
            </Link>
          ) : (
            <a className="announce__link" href={banner.link} target="_blank" rel="noopener noreferrer">
              {banner.linkLabel || 'Learn more'}
            </a>
          ))}
      </p>
    </div>
  );
}
