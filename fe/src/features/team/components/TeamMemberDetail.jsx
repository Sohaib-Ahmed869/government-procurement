import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { articlesApi } from '../../../api';
import { getMember } from '../data.js';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
import TeamAvatar from './TeamAvatar.jsx';
import './TeamMemberDetail.css';

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
  const member = getMember(slug);

  // Published work is the CMS insights feed. Kept to the first few — the "View
  // more" link below the grid goes to the full listing. A failure just leaves
  // the section hidden rather than showing an error on a profile page.
  const [articles, setArticles] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await articlesApi.list({ limit: 4 });
        if (alive) setArticles(list || []);
      } catch {
        /* section stays hidden */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
      <div className="tm__inner">
        <div className="tm__hero">
          <TeamAvatar member={member} className="tm__avatar" />

          <div className="tm__intro">
            <BackLink />

            <h1 className="tm__name">{member.name}</h1>
            <p className="tm__role">
              {member.role}, {member.location}
            </p>

            <p className="tm__bio">{member.summary}</p>

            <div className="tm__actions">
              <a className="tm__action" href={`mailto:${member.email}`}>
                <span className="tm__action-icon" aria-hidden="true">
                  <MailIcon />
                </span>
                Contact
              </a>
              <a
                className="tm__action"
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="tm__action-icon" aria-hidden="true">
                  <LinkedInIcon />
                </span>
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Body: the written profile on the left, contact CTA + expertise in a
            narrower column on the right. Every block after About renders only
            when there's content for it. */}
        <div className="tm__body">
          <div className="tm__main">
            <section className="tm__block">
              <h2 className="tm__block-title">About {firstName}</h2>
              {member.about.map((paragraph) => (
                <p className="tm__para" key={paragraph.slice(0, 40)}>
                  {paragraph}
                </p>
              ))}
            </section>

            {publications.length > 0 && (
              <section className="tm__block">
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
              <section className="tm__block">
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
              <section className="tm__block">
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
            <a className="tm__cta" href={`mailto:${member.email}`}>
              <MailIcon />
              Get in touch
            </a>

            {member.expertise.length > 0 && (
              <section className="tm__block">
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
              {articles.map((article) => {
                const image = article.heroImage?.url || null;
                const date = formatDate(article.publishedAt);
                return (
                  <li key={article._id}>
                    <Link className="tm__work-card" to={`/insights/${article.slug}`}>
                      <span className="tm__work-art">
                        {image && <img src={image} alt="" />}
                      </span>
                      {article.topic && <span className="tm__work-type">{article.topic}</span>}
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

            <Link className="tm__work-more" to="/insights">
              View more
            </Link>
          </section>
        )}
      </div>
    </section>
  );
}
