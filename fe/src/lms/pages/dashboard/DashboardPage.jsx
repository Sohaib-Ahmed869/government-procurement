import { Link } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import ProgressBar from '../../components/progress/ProgressBar.jsx';
import { firstNameOf } from '../../utils/names.js';
import ActivityChart from '../../components/progress/ActivityChart.jsx';
import { CATALOGUE, ENROLMENTS, WEEK_ACTIVITY } from '../../hooks/placeholderData.js';

/* ---------------------------------------------------------------------------
   PLACEHOLDER DATA
   The LMS endpoints do not exist yet (no Enrollment / Progress / Lesson models
   on the backend), so the dashboard renders from this block. It is shaped the
   way the API will return it, so wiring it up later is a swap of this constant
   for a fetch. Nothing below it needs to change.

   The resume panel reads from the shared placeholder source rather than its own
   copy, so the dashboard, My Courses and the course outline can't disagree
   about which lesson is next.
   ------------------------------------------------------------------------ */
const RESUME_SLUG = 'commonwealth-procurement-rules';
const resumeCourse = CATALOGUE.find((c) => c.slug === RESUME_SLUG);
const resumeEnrolment = ENROLMENTS[RESUME_SLUG];

const RESUME = {
  courseTitle: resumeCourse.title,
  courseSlug: RESUME_SLUG,
  lessonTitle: `Module 3 · ${resumeEnrolment.next.title}`,
  lessonId: resumeEnrolment.next.id,
  lessonsDone: resumeEnrolment.lessonsDone,
  lessonsTotal: resumeCourse.lessons,
  minutesLeft: resumeEnrolment.minutesLeft,
  nextDue: '19 Aug',
};

const STATS = [
  { key: 'inProgress', label: 'Courses in progress', value: 3, hint: '1 due this week', icon: 'book', to: '/learn/my-courses' },
  { key: 'certificates', label: 'Certificates earned', value: 2, hint: 'Latest: Ethics & Probity', icon: 'award', to: '/learn/certificates' },
];


const UPCOMING = [
  { id: 'u1', title: 'Quiz · Approaching the market', meta: 'Commonwealth Procurement Rules', due: 'Due in 3 days', state: 'due', icon: 'quiz', to: '/learn/my-courses' },
  { id: 'u2', title: 'Assessment · Probity case study', meta: 'Ethics & Probity in Procurement', due: 'Due 26 Aug', state: 'due', icon: 'quiz', to: '/learn/my-courses' },
  { id: 'u3', title: 'Live session · Q&A with the panel', meta: 'Tender Writing Essentials', due: '2 Sep, 11:00', state: 'plain', icon: 'video', to: '/learn/my-courses' },
];

const ACTIVITY = [
  { id: 'a1', title: 'Completed “Risk and the procurement lifecycle”', meta: 'Commonwealth Procurement Rules', when: '2h ago', icon: 'check' },
  { id: 'a2', title: 'Scored 88% on “Probity fundamentals”', meta: 'Ethics & Probity in Procurement', when: 'Yesterday', icon: 'quiz' },
  { id: 'a3', title: 'Earned the “Fast Starter” badge', meta: 'Five lessons in a week', when: '2 days ago', icon: 'badge' },
  { id: 'a4', title: 'Bookmarked “Evaluating tender responses”', meta: 'Tender Writing Essentials', when: '4 days ago', icon: 'bookmark' },
];

/* ------------------------------------------------------------------------ */

const ICONS = {
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>,
  award: <><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8.5 6 3.5-6 3.5z" /></>,
  quiz: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9.5 12.5a1.6 1.6 0 0 1 3 .6c0 1.1-1.5 1.3-1.5 2.2" /><path d="M11 18h.01" /></>,
  video: <><rect x="2" y="5" width="14" height="14" rx="2.5" /><path d="m16 10 6-3v10l-6-3z" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  badge: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  bookmark: <><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>,
};

function Icon({ name, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] || ICONS.book}
    </svg>
  );
}

// "1h 35m" / "45m" / "-"
function duration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}


export default function DashboardPage() {
  const { user } = useStudentAuth();
  const now = new Date();
  // Signed out, "there" reads oddly as a heading on its own line, so the
  // greeting falls back to a plain welcome instead of a stand-in name.
  const firstName = user?.name ? firstNameOf(user.name) : 'Welcome back';

  const weekTotal = WEEK_ACTIVITY.reduce((sum, d) => sum + d.minutes, 0);
  const pct = Math.round((RESUME.lessonsDone / RESUME.lessonsTotal) * 100);

  return (
    <div>
      <section className="lms-greeting">
        <p className="lms-greeting__eyebrow">{greeting(now.getHours())}</p>
        <h1 className="lms-greeting__name">{firstName} 👋</h1>
        <p className="lms-greeting__text">
          You’ve learned {duration(weekTotal)} this week. Pick up where you left off, or
          browse the catalogue for something new.
        </p>
        <p className="lms-greeting__meta">
          <Icon name="calendar" />
          {now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </section>

      <div className="lms-dash-row">
        {/* Continue learning */}
        <section className="lms-card">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <Icon name="play" />
              Continue learning
            </h2>
            <span className="lms-pill lms-pill--due">Next due {RESUME.nextDue}</span>
          </div>

          <p className="lms-resume__course">{RESUME.courseTitle}</p>
          <p className="lms-resume__lesson">
            <Icon name="video" />
            {RESUME.lessonTitle}
          </p>

          <div className="lms-resume__body">
            <div style={{ flex: 1, minWidth: 240 }}>
              <ProgressBar
                percent={pct}
                left={
                  <>
                    <strong>{RESUME.lessonsDone}</strong> of {RESUME.lessonsTotal} lessons
                  </>
                }
                right={<strong>{pct}%</strong>}
              />
              <div style={{ marginTop: 18 }}>
                <Link
                  className="lms-btn lms-btn--primary"
                  to={`/learn/courses/${RESUME.courseSlug}/watch/${RESUME.lessonId}`}
                >
                  <Icon name="play" />
                  Resume lesson
                </Link>
              </div>
            </div>

            <div className="lms-resume__facts">
              <span className="lms-fact">
                Time left <strong>{duration(RESUME.minutesLeft)}</strong>
              </span>
              <span className="lms-fact">
                This week <strong>{duration(weekTotal)}</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Two headline numbers, stacked beside the resume panel. */}
        <div className="lms-dash-stats">
          {STATS.map((s) => (
            <Link key={s.key} to={s.to} className="lms-stat">
              <span className="lms-stat__icon"><Icon name={s.icon} /></span>
              <span>
                <span className="lms-stat__label">{s.label}</span>
                <span className="lms-stat__value" style={{ display: 'block' }}>{s.value}</span>
                <span className="lms-stat__hint">{s.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <section className="lms-card" style={{ marginBottom: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <Icon name="chart" />
            Weekly activity
          </h2>
          <span className="lms-card__note">Minutes learned per day</span>
        </div>
        <ActivityChart data={WEEK_ACTIVITY} caption="Minutes learned per day" />
      </section>

      <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <section className="lms-card">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <Icon name="clock" />
              Upcoming
            </h2>
            <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/my-courses">
              View all
            </Link>
          </div>
          <div className="lms-list">
            {UPCOMING.length === 0 ? (
              <p className="lms-empty">Nothing due. Enjoy the breathing room.</p>
            ) : (
              UPCOMING.map((item) => (
                <Link key={item.id} to={item.to} className="lms-list__item">
                  <span className="lms-list__icon"><Icon name={item.icon} /></span>
                  <span className="lms-list__body">
                    <span className="lms-list__title">{item.title}</span>
                    <span className="lms-list__meta">{item.meta}</span>
                  </span>
                  <span className={item.state === 'due' ? 'lms-pill lms-pill--due' : 'lms-list__trail'}>
                    {item.due}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="lms-card">
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <Icon name="check" />
              Recent activity
            </h2>
            <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/progress">
              My progress
            </Link>
          </div>
          <div className="lms-list">
            {ACTIVITY.length === 0 ? (
              <p className="lms-empty">Your completed lessons will show up here.</p>
            ) : (
              ACTIVITY.map((item) => (
                <span key={item.id} className="lms-list__item">
                  <span className="lms-list__icon"><Icon name={item.icon} /></span>
                  <span className="lms-list__body">
                    <span className="lms-list__title">{item.title}</span>
                    <span className="lms-list__meta">{item.meta}</span>
                  </span>
                  <span className="lms-list__trail">{item.when}</span>
                </span>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
