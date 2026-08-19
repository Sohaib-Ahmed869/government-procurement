import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaLinkedin } from 'react-icons/fa6';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { teamApi } from '../../../api';
import TeamAvatar from './TeamAvatar.jsx';
import './TeamGrid.css';

export default function TeamGrid() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();

  // Roster comes from the CMS (Content → Team), ordered there.
  const [team, setTeam] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await teamApi.list();
        if (!alive) return;
        setTeam(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section
      ref={ref}
      className={`team hm-band--light${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="team__inner">
        {status === 'loading' && <p className="team__empty">Loading the team…</p>}
        {status === 'error' && (
          <p className="team__empty">
            We couldn&apos;t load the team right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && team.length === 0 && (
          <p className="team__empty">No team members have been published yet.</p>
        )}

        <ul className="team__grid">
          {team.map((member) => (
            <li key={member._id || member.slug}>
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
                  {[member.role, member.location].filter(Boolean).join(', ')}
                </p>

                <span className="team-card__rule" aria-hidden="true" />

                <p className="team-card__summary">{member.summary}</p>

                <div className="team-card__actions">
                  <a
                    className="team-card__icon"
                    href={`mailto:${member.email}`}
                    aria-label={`Email ${member.name}`}
                  >
                    <FaEnvelope className="team-card__icon-glyph" aria-hidden="true" />
                  </a>
                  <a
                    className="team-card__icon"
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                  >
                    <FaLinkedin className="team-card__icon-glyph" aria-hidden="true" />
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
