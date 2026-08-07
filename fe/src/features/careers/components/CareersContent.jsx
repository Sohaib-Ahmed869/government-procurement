import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { careersApi } from '../../../api';
import './CareersContent.css';

// Applications come by email, to the same address as the footer's contact block.
const CV_EMAIL = 'mkheir@govprocurement.com.au';
// A proposed role rather than an application to an advertised one — its own
// subject line so those land distinctly in the same inbox.
const OWN_ROLE_HREF = `mailto:${CV_EMAIL}?subject=${encodeURIComponent('Role proposal')}`;

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
        {/* --- roles --- */}
        {/* The heading stands whether or not anything is open: an empty careers
            page reads as broken, and "nothing right now" is useful in itself. */}
        <section className="careers__block">
          <h2 className="careers__heading">Roles we are hiring for</h2>

          {roles.length > 0 ? (
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
          ) : (
            <p className="careers__copy">
              We aren&rsquo;t hiring for any positions at the moment. New roles
              are posted here as they open, and we&rsquo;re glad to hear from you
              in the meantime.
            </p>
          )}

        </section>

        {/* --- reverse brief: propose a role rather than answer an advert --- */}
        <section className="careers__block">
          <h2 className="careers__heading">Create your own role</h2>
          <p className="careers__copy">
            Tell us the role you think we should be hiring for and why you are
            the person to do it. Send your CV with a short
            note covering what the role would involve, the problem it solves for
            our clients, and the experience you would bring to it.
          </p>
          <a className="careers__cta-btn" href={OWN_ROLE_HREF}>
            Propose a role
          </a>
        </section>
      </div>
    </section>
  );
}
