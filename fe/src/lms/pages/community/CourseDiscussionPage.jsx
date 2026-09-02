import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import DiscussionComposer from '../../components/community/DiscussionComposer.jsx';
import { useDiscussions } from '../../hooks/useDiscussions.js';
import { useMyCourses } from '../../hooks/useMyCourses.js';
import Select from '../../components/Select.jsx';

function ago(iso) {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'mine', label: 'My questions' },
];

// Course discussion (L5). Serves both the whole-library view from the sidebar
// and a single course's threads via ?course=. The link from the course
// overview page.
export default function CourseDiscussionPage() {
  const { threads, status, error, ask } = useDiscussions();
  const { courses } = useMyCourses();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');

  const courseFilter = params.get('course') ?? 'all';
  const enrolled = useMemo(
    () => courses.map((c) => ({ slug: c.slug, title: c.title })),
    [courses],
  );

  // Which course a new question goes on. Follows the filter when one is set,
  // because arriving from a course page and being asked to pick it again is a
  // step that answers itself.
  const [askCourse, setAskCourse] = useState(null);
  const onCourse = askCourse ?? (courseFilter !== 'all' ? courseFilter : enrolled[0]?.slug);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads
      .filter((t) => {
        if (courseFilter !== 'all' && t.slug !== courseFilter) return false;
        if (tab === 'unanswered' && t.replyCount > 0) return false;
        if (tab === 'mine' && !t.mine) return false;
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q) ||
          t.courseTitle.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));
  }, [threads, courseFilter, tab, query]);

  const setCourse = (slug) => {
    if (slug === 'all') params.delete('course');
    else params.set('course', slug);
    setParams(params, { replace: true });
  };

  const activeCourse = enrolled.find((c) => c.slug === courseFilter);

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Discussions</h1>
          <p className="lms-page__subtitle">
            {activeCourse
              ? `Questions and answers on ${activeCourse.title}.`
              : 'Questions and answers across the courses you’re enrolled in.'}
          </p>
        </div>
        <div className="lms-page__actions">
          <button
            type="button"
            className="lms-btn lms-btn--primary"
            onClick={() => setAsking((v) => !v)}
          >
            <LmsIcon name="plus" />
            Ask a question
          </button>
        </div>
      </div>

      {asking ? (
        <div className="lms-card" style={{ marginBottom: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="chat" />
              Ask a question
            </h2>
          </div>
          <DiscussionComposer
            withTitle
            courses={enrolled}
            courseSlug={onCourse}
            onCourseChange={setAskCourse}
            submitLabel="Post question"
            placeholder="Give enough context that someone can actually answer: what you tried, and what you expected."
            onSubmit={async ({ title, body }) => {
              setAskError('');
              try {
                await ask({ slug: onCourse, title, body });
                setAsking(false);
              } catch (err) {
                // Kept on screen with the text still in the box. A question
                // that silently failed to post is one the learner thinks they
                // asked and nobody ever sees.
                setAskError(err?.message ?? 'Your question didn’t post. Try again.');
              }
            }}
          />
          {askError ? <p className="lms-field__error">{askError}</p> : null}
        </div>
      ) : null}

      <div className="lms-filters">
        <div className="lms-segmented">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`lms-segmented__btn${tab === t.value ? ' is-active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="lms-filters__right">
          <div className="lms-search lms-search--inline">
            <LmsIcon name="search" />
            <input
              type="search"
              value={query}
              placeholder="Search discussions…"
              aria-label="Search discussions"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            className="lms-sort"
            aria-label="Filter by course"
            value={courseFilter}
            onChange={setCourse}
            options={[
              { value: 'all', label: 'All courses' },
              ...enrolled.map((c) => ({ value: c.slug, label: c.title })),
            ]}
          />
        </div>
      </div>

      {status === 'loading' ? (
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '44%', height: 20 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 18 }} />
        </div>
      ) : status === 'error' ? (
        <div className="lms-card"><p className="lms-empty">{error}</p></div>
      ) : visible.length === 0 ? (
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="chat" className="lms-blank__icon" />
            <h2>{query.trim() ? 'Nothing matches' : 'No questions here yet'}</h2>
            <p>
              {tab === 'mine'
                ? 'You haven’t asked anything yet. Questions get answered by instructors and other learners on the same course.'
                : 'Be the first to ask. It usually helps whoever hits the same thing next.'}
            </p>
            <button type="button" className="lms-btn lms-btn--primary" onClick={() => setAsking(true)}>
              Ask a question
            </button>
          </div>
        </div>
      ) : (
        <ul className="lms-threads">
          {visible.map((t) => (
            <li key={t.id} className="lms-thread">
              <Link className="lms-thread__main" to={`/learn/discussions/${t.id}`}>
                <span className="lms-thread__stats">
                  <span className="lms-thread__stat">
                    <strong>{t.votes}</strong>
                    <span>votes</span>
                  </span>
                  <span className={`lms-thread__stat${t.replyCount ? ' is-answered' : ''}`}>
                    <strong>{t.replyCount}</strong>
                    <span>replies</span>
                  </span>
                </span>

                <span className="lms-thread__body">
                  <span className="lms-thread__title">{t.title}</span>
                  <span className="lms-thread__excerpt">{t.body}</span>
                  <span className="lms-thread__meta">
                    <span className="lms-thread__course">
                      <LmsIcon name="book" />
                      {t.courseTitle}
                    </span>
                    <span>{t.author}</span>
                    <span>{ago(t.lastActivityAt)}</span>
                    {t.hasInstructorReply ? (
                      <span className="lms-badge-inst">Instructor answered</span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
