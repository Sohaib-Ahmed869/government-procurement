import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../context/AudienceContext.jsx';
import { announcementsApi } from '../../api';
import './AnnouncementBanner.css';

// Thin site-wide banner driven by the CMS (the active, in-window announcement).
// Dismissible per-message; the dismissal is remembered in localStorage so it
// doesn't reappear until a different announcement is published.
export default function AnnouncementBanner() {
  const { audience } = useAudience();
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let alive = true;
    announcementsApi
      .active()
      .then((b) => {
        if (!alive || !b) return;
        const dismissed = localStorage.getItem('gp.banner.dismissed');
        if (dismissed !== (b._id || b.id)) setBanner(b);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!banner) return null;

  const dismiss = () => {
    try {
      localStorage.setItem('gp.banner.dismissed', banner._id || banner.id);
    } catch {
      /* ignore */
    }
    setBanner(null);
  };

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
      <button type="button" className="announce__close" aria-label="Dismiss announcement" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
