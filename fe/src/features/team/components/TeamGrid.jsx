import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaLinkedin } from 'react-icons/fa6';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { teamApi } from '../../../api';
import TeamAvatar from './TeamAvatar.jsx';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
import { readCache, writeCache, hasCache } from '../../../api/cache.js';
import './TeamGrid.css';

// What this page's read is remembered under for the life of the tab.
const CACHE_KEY = 'team';

export default function TeamGrid() {
  const { audience } = useAudience();

  // Roster comes from the CMS (Content → Team), ordered there.
  /* Seeded from the tab's cache, so coming back to this page renders the
     roster on the first frame rather than showing an empty section for the
     length of a round trip — which is the gap that reads as a flash where the
     footer's contact band sits. The request below still goes out, so an edit
     made in the CMS lands on this view. See api/cache.js. */
  const [team, setTeam] = useState(() => readCache(CACHE_KEY) ?? []);
  const [status, setStatus] = useState(() => (hasCache(CACHE_KEY) ? 'ready' : 'loading'));

  // Held until the roster is in hand: the grid is empty while it loads, and a
  // reveal played over an empty grid leaves `is-in` on the section, so the cards
  // land at full opacity with no animation left to play.
  const { ref, inView } = useInView({ ready: status !== 'loading' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await teamApi.list();
        if (!alive) return;
        writeCache(CACHE_KEY, list || []);
        setTeam(list || []);
        setStatus('ready');
      } catch {
        // A failed REFRESH must not blank a page that is already showing the
        // cached answer, so the error state is only for a page with nothing on
        // it yet.
        if (alive) setStatus((current) => (current === 'ready' ? 'ready' : 'error'));
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
        <LoadingStatus loading={status === 'loading'} label="Loading the team" />
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
