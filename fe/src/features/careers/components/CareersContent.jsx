import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { careersApi } from '../../../api';
import './CareersContent.css';

// Applications come by email, to the same address as the footer's contact block.
const CV_EMAIL = 'mkheir@govprocurement.com.au';
const CV_HREF = `mailto:${CV_EMAIL}?subject=${encodeURIComponent('CV submission')}`;
const LINKEDIN_HREF = 'https://www.linkedin.com/company/governmentprocurement/';

// An opening's Apply link is optional in the CMS. Left blank, Apply emails the
// careers inbox with the role in the subject line.
function applyHref(role) {
  const url = String(role.applyUrl || '').trim();
  if (!url) {
    const subject = role.title ? `Application: ${role.title}` : 'Application';
    return `mailto:${CV_EMAIL}?subject=${encodeURIComponent(subject)}`;
  }
  // Schemes we pass through as-is, plus internal paths. A bare domain from the
  // CMS ("www.seek.com.au/…") would otherwise resolve against /careers and 404,
  // so it gets https://.
  if (/^(https?:|mailto:|tel:)/i.test(url) || url.startsWith('/')) return url;
  return `https://${url}`;
}

// External links open in a new tab so the visitor keeps the Careers page. A
// mailto:/tel: must not — the handler opens elsewhere and _blank would strand an
// empty tab behind it.
function applyTargetProps(href) {
  return /^https?:\/\//i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}


export default function CareersContent() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  // Openings come from the CMS (Content → Careers). With none published the
  // whole section is left out rather than showing an empty heading.
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await careersApi.listOpenings();
        if (alive) setRoles(list || []);
      } catch {
        /* section stays hidden */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section
      ref={ref}
      className={`careers${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="careers__inner">
        {/* --- current opportunities --- */}
        <section className="careers__block">
          <h2 className="careers__heading">Current job opportunities</h2>
          <p className="careers__copy">
            We recruit across our procurement consulting roles. Open positions
            are listed below; use the apply link to start a conversation.
          </p>
          <p className="careers__copy">
            We aren&rsquo;t always advertising, but we&rsquo;re happy to receive
            open applications year-round. To be considered for future roles, send
            us your CV and a short covering note.
          </p>
          <a
            className="careers__linkedin"
            href={LINKEDIN_HREF}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow us on LinkedIn to hear when we&rsquo;re hiring
          </a>
        </section>

        {/* --- roles --- */}
        {roles.length > 0 && (
          <section className="careers__block">
            <h2 className="careers__heading">Roles we are hiring for</h2>
            <ul className="careers__roles">
              {roles.map((role) => {
                const href = applyHref(role);
                return (
                  <li className="careers-role" key={role._id || role.title}>
                    <h3 className="careers-role__title">{role.title}</h3>
                    <p className="careers-role__body">{role.description}</p>
                    <a
                      className="careers-role__apply"
                      href={href}
                      {...applyTargetProps(href)}
                    >
                      Apply
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* --- closing CTA --- */}
        <section className="careers__cta">
          <h2 className="careers__cta-title">Apply to join our team</h2>
          <p className="careers__cta-copy">
            Culture is our most valued asset. We are respectful, we promote
            better ways of working, and we listen to what our clients are
            actually trying to achieve. We collaborate, mentor and support each
            other&rsquo;s growth.
          </p>
          <a className="careers__cta-btn" href={CV_HREF}>
            Submit your CV
          </a>
        </section>
      </div>
    </section>
  );
}
