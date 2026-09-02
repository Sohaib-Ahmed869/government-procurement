import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { useQuestionInbox } from '../../hooks/useDiscussions.js';
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
  { value: 'unanswered', label: 'Needs an answer' },
  { value: 'all', label: 'All' },
  { value: 'resolved', label: 'Resolved' },
];

// Questions (L5 / R1): the instructor's side of course discussion.
//
// The SAME threads the learners are reading — filtered to the courses this
// instructor wrote rather than the ones they're enrolled in. Answering happens
// in the thread itself, which is the learner's screen too, so there is one
// conversation rather than an instructor view and a student view that have to
// be kept in step.
//
// Opens on what needs an answer, because that is the only reason to come here.
// "Unanswered" means nobody from the teaching side has replied: a thread with
// three learner replies and no instructor answer is still waiting.
export default function QuestionsPage() {
  const { threads, totals, courses, status, error } = useQuestionInbox();
  const [tab, setTab] = useState('unanswered');
  const [courseFilter, setCourseFilter] = useState('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (tab === 'unanswered' && t.hasInstructorReply) return false;
      if (tab === 'resolved' && !t.resolved) return false;
      if (courseFilter !== 'all' && t.slug !== courseFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q)
      );
    });
  }, [threads, tab, courseFilter, query]);

  const head = (
    <div className="lms-page__head">
      <div>
        <h1 className="lms-page__title">Questions</h1>
        <p className="lms-page__subtitle">
          What learners are asking on your courses. Answering happens in the thread.
        </p>
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div>
        {head}
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '40%', height: 22 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div>
        {head}
        <div className="lms-card"><p className="lms-empty">{error}</p></div>
      </div>
    );
  }

  if (!threads.length) {
    return (
      <div>
        {head}
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="chat" className="lms-blank__icon" />
            <h2>{courses.length ? 'No questions yet' : 'No courses yet'}</h2>
            <p>
              {courses.length
                ? 'Nobody has asked anything on your courses. When they do, it lands here and you answer in the thread.'
                : 'Build and publish a course. Questions from your learners arrive here.'}
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses">
              <LmsIcon name="book" />
              My courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {head}

      <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {[
          {
            icon: 'chat', label: 'Needs an answer', value: totals.unanswered ?? 0,
            hint: 'Nobody from your side has replied',
          },
          { icon: 'check', label: 'Resolved', value: totals.resolved ?? 0, hint: 'An answer is marked' },
          {
            icon: 'note', label: 'Total asked', value: totals.total ?? 0,
            hint: `Across ${totals.courses ?? 0} course${totals.courses === 1 ? '' : 's'}`,
          },
        ].map((s) => (
          <span key={s.label} className="lms-stat is-static">
            <span className="lms-stat__icon"><LmsIcon name={s.icon} /></span>
            <span>
              <span className="lms-stat__label">{s.label}</span>
              <span className="lms-stat__value">{s.value}</span>
              <span className="lms-stat__hint">{s.hint}</span>
            </span>
          </span>
        ))}
      </div>

      <div className="lms-filters" style={{ marginTop: 18 }}>
        <div className="lms-segmented">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`lms-segmented__btn${tab === t.value ? ' is-active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              {t.value === 'unanswered' && totals.unanswered ? ` (${totals.unanswered})` : ''}
            </button>
          ))}
        </div>
        <div className="lms-filters__right">
          <div className="lms-search lms-search--inline">
            <LmsIcon name="search" />
            <input
              type="search"
              value={query}
              placeholder="Search questions…"
              aria-label="Search questions"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            className="lms-sort"
            aria-label="Filter by course"
            value={courseFilter}
            onChange={setCourseFilter}
            options={[
              { value: 'all', label: 'All courses' },
              ...courses.map((c) => ({ value: c.slug, label: c.title })),
            ]}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="lms-card">
          <p className="lms-empty">
            {tab === 'unanswered'
              ? 'Nothing waiting. Every question on your courses has an answer from you.'
              : 'Nothing matches those filters.'}
          </p>
        </div>
      ) : (
        // The same row markup the learners' list uses, so a question looks the
        // same on both sides of the app.
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
                    {t.resolved ? (
                      <span className="lms-pill lms-pill--done">Resolved</span>
                    ) : t.hasInstructorReply ? (
                      <span className="lms-badge-inst">You replied</span>
                    ) : (
                      <span className="lms-pill lms-pill--due">Needs an answer</span>
                    )}
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
