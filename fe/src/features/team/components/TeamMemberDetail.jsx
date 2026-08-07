import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaLinkedin } from 'react-icons/fa6';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { articlesApi, teamApi } from '../../../api';
import TeamAvatar from './TeamAvatar.jsx';
import './TeamMemberDetail.css';

// Two rows of the 4-up desktop "Published work" grid.
const WORK_PAGE_SIZE = 8;

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function BackLink() {
  return (
    <Link className="tm__back" to="/our-team">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="15 6 9 12 15 18" />
      </svg>
      Back to Our Team
    </Link>
  );
}

export default function TeamMemberDetail({ slug }) {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  // The profile comes from the CMS (Content → Team). `null` while loading,
  // `false` once we know there's nothing at this slug.
  const [member, setMember] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const found = await teamApi.getBySlug(slug);
        if (alive) setMember(found || false);
      } catch {
        if (alive) setMember(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // Published work is this member's own insights — the ones whose Author is set
  // to them in the CMS. Fetched once the profile has loaded, since the filter is
  // their name. A failure just leaves the section hidden rather than showing an
  // error on a profile page.
  const [articles, setArticles] = useState([]);
  const authorName = member?.name;
  useEffect(() => {
    if (!authorName) return undefined;
    let alive = true;
    (async () => {
      try {
        const list = await articlesApi.list({ author: authorName, limit: 100 });
        if (alive) setArticles(list || []);
      } catch {
        /* section stays hidden */
      }
    })();
    return () => {
      alive = false;
    };
  }, [authorName]);

  // Two rows of the 4-up desktop grid. "View more" adds another batch in place
  // rather than sending the visitor off to the full Insights listing.
  const [shownWork, setShownWork] = useState(WORK_PAGE_SIZE);
  useEffect(() => {
    setShownWork(WORK_PAGE_SIZE);
  }, [authorName]);
  const visibleArticles = articles.slice(0, shownWork);

  // Still loading — hold the page rather than flashing "not found".
  if (member === null) {
    return (
      <section className="tm" data-audience={audience}>
        <div className="tm__inner">
          <BackLink />
          <p className="tm__bio">Loading…</p>
        </div>
      </section>
    );
  }

  // Unknown slug: keep the page on-theme and offer the way back rather than
  // dropping the visitor on the 404.
  if (!member) {
    return (
      <section className="tm is-in" data-audience={audience}>
        <div className="tm__inner">
          <BackLink />
          <h1 className="tm__name">Profile not found</h1>
          <p className="tm__bio">
            We couldn&rsquo;t find that team member. They may have moved on, or
            the link may be out of date.
          </p>
        </div>
      </section>
    );
  }

  // "About Mohammed" rather than "About Mohammed Kheir", as in the reference.
  const firstName = member.name.split(' ')[0];
  // Optional sections: absent from a record until the content exists.
  const publications = member.publications || [];
  const pastExperience = member.pastExperience || [];
  const education = member.education || [];

  return (
    <section
      ref={ref}
      className={`tm${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      {/* The hero sits in its own full-bleed band so its gradient runs edge to
          edge, rather than stopping at the 1100px column. */}
      <div className="tm__hero-band">
        <div className="tm__inner tm__inner--hero">
          <div className="tm__hero">
            <TeamAvatar member={member} className="tm__avatar" />

            <div className="tm__intro">
              <BackLink />

              <h1 className="tm__name">{member.name}</h1>
              {/* "Partner, Melbourne" — the location picked out from the role
                  in the accent colour, as on the reference profile. */}
              <p className="tm__role">
                {member.role}
                {member.role && member.location && ', '}
                {member.location && (
                  <span className="tm__location">{member.location}</span>
                )}
              </p>

              <p className="tm__bio">{member.summary}</p>

              <div className="tm__actions">
                <a className="tm__action" href={`mailto:${member.email}`}>
                  <FaEnvelope className="tm__action-icon" aria-hidden="true" />
                  Contact
                </a>
                <a
                  className="tm__action"
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaLinkedin className="tm__action-icon" aria-hidden="true" />
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tm__inner">
        {/* Body: the written profile on the left, contact CTA + expertise in a
            narrower column on the right. Every block after About renders only
            when there's content for it. */}
        <div className="tm__body">
          <div className="tm__main">
            <section className="tm__block tm__block--about">
              <h2 className="tm__block-title">About {firstName}</h2>
              {(member.about || []).map((paragraph) => (
                <p className="tm__para" key={paragraph.slice(0, 40)}>
                  {paragraph}
                </p>
              ))}
            </section>

            {publications.length > 0 && (
              <section className="tm__block tm__block--publications">
                <h2 className="tm__block-title">Published work</h2>
                {publications.map((item) => (
                  <p className="tm__citation" key={item.title}>
                    &ldquo;
                    {item.href ? (
                      <a
                        className="tm__citation-link"
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                    &rdquo;{item.publisher ? `, ${item.publisher}` : ''}
                    {item.date ? `, ${item.date}` : ''}
                  </p>
                ))}
              </section>
            )}

            {pastExperience.length > 0 && (
              <section className="tm__block tm__block--experience">
                <h2 className="tm__block-title">Past experience</h2>
                {pastExperience.map((item) => (
                  <div className="tm__entry" key={`${item.org}-${item.role}`}>
                    <p className="tm__entry-name">{item.org}</p>
                    <p className="tm__entry-detail">{item.role}</p>
                  </div>
                ))}
              </section>
            )}

            {education.length > 0 && (
              <section className="tm__block tm__block--education">
                <h2 className="tm__block-title">Education</h2>
                {education.map((item) => (
                  <div className="tm__entry" key={`${item.school}-${item.qualification}`}>
                    <p className="tm__entry-name">{item.school}</p>
                    <p className="tm__entry-detail">{item.qualification}</p>
                  </div>
                ))}
              </section>
            )}
          </div>

          <aside className="tm__aside">
            {/* Contact sits in the hero beside the portrait — no second call to
                action down here. */}
            {(member.expertise || []).length > 0 && (
              <section className="tm__block tm__block--expertise">
                <h2 className="tm__block-title">Expertise</h2>
                <ul className="tm__expertise">
                  {member.expertise.map((item) => (
                    <li className="tm__expertise-item" key={item}>
                      <svg
                        className="tm__expertise-chevron"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                      >
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>

        {articles.length > 0 && (
          <section className="tm__block tm__work">
            <h2 className="tm__block-title">Published work</h2>

            <ul className="tm__work-grid">
              {visibleArticles.map((article) => {
                const image = article.heroImage?.url || null;
                const date = formatDate(article.publishedAt);
                return (
                  <li key={article._id}>
                    <Link className="tm__work-card" to={`/insights/${article.slug}`}>
                      <span className="tm__work-art">
                        {image && <img src={image} alt="" />}
                      </span>
                      {article.category?.name && (
                        <span className="tm__work-type">{article.category.name}</span>
                      )}
                      <span className="tm__work-title">
                        {article.title}
                        <svg
                          className="tm__work-chevron"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          aria-hidden="true"
                        >
                          <polyline points="9 6 15 12 9 18" />
                        </svg>
                      </span>
                      {date && <span className="tm__work-date">{date}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {shownWork < articles.length && (
              <button
                type="button"
                className="tm__work-more"
                onClick={() => setShownWork((n) => n + WORK_PAGE_SIZE)}
              >
                View more
              </button>
            )}
          </section>
        )}
      </div>
    </section>
  );
}
