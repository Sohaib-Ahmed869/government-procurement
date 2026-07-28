import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { TEAM } from '../data.js';
import TeamAvatar from './TeamAvatar.jsx';
import './TeamGrid.css';

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="2.5" y="5" width="19" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 7.5 12 13l8.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
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
  );
}

export default function TeamGrid() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  return (
    <section
      ref={ref}
      className={`team${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="team__inner">
        <ul className="team__grid">
          {TEAM.map((member) => (
            <li key={member.slug}>
              {/* Members with a profile get a link on the name that stretches
                  over the whole card; the mail / LinkedIn buttons sit above it
                  so they stay separately clickable without nesting anchors.
                  The rest render as static cards. */}
              <article
                className={`team-card${member.hasProfile ? '' : ' team-card--static'}`}
              >
                <TeamAvatar member={member} className="team-card__avatar" />

                <h2 className="team-card__name">
                  {member.hasProfile ? (
                    <Link className="team-card__link" to={`/our-team/${member.slug}`}>
                      {member.name}
                    </Link>
                  ) : (
                    member.name
                  )}
                </h2>

                <p className="team-card__role">
                  {member.role}, {member.location}
                </p>

                <span className="team-card__rule" aria-hidden="true" />

                <p className="team-card__summary">{member.summary}</p>

                <div className="team-card__actions">
                  <a
                    className="team-card__icon"
                    href={`mailto:${member.email}`}
                    aria-label={`Email ${member.name}`}
                  >
                    <MailIcon />
                  </a>
                  <a
                    className="team-card__icon"
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                  >
                    <LinkedInIcon />
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
