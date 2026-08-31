import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { useInstructorCourses, useInstructorSummary } from '../../hooks/useInstructor.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import { firstNameOf } from '../../utils/names.js';

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// The instructor's home (R1).
export default function InstructorDashboardPage() {
  const { user } = useStudentAuth();
  const { courses } = useInstructorCourses();
  const s = useInstructorSummary();
  const now = new Date();
  // Empty rather than firstNameOf's "there" default: the greeting is one line
  // now, and "Good afternoon, there" is worse than "Good afternoon".
  const firstName = firstNameOf(user?.name, '');

  const stats = [
    { key: 'courses', icon: 'book', value: s.courses, label: 'Courses', to: '/learn/instructor/courses' },
    { key: 'learners', icon: 'users', value: s.learners.toLocaleString('en-AU'), label: 'Enrolled learners', to: '/learn/instructor/students' },
    { key: 'lessons', icon: 'lessons', value: s.lessons, label: 'Lessons published' },
    { key: 'rating', icon: 'star', value: s.averageRating ?? '-', label: 'Average rating', to: '/learn/instructor/reviews' },
  ];

  return (
    <div>
      {/* Matches the learner dashboard, which dropped the solid green band for
          the page head every other LMS screen uses. This page renders the same
          component; leaving it would have been the same block on one dashboard
          and not the other. */}
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">
            {greeting(now.getHours())}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="lms-page__subtitle">
            {s.courses
              ? `You’re teaching ${s.courses} course${s.courses === 1 ? '' : 's'} to ${s.learners.toLocaleString('en-AU')} learners.`
              : 'Nothing published yet. Build your first course and it’ll show up here.'}
          </p>
        </div>
        <p className="lms-page__date">
          <LmsIcon name="calendar" />
          {now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>


      <div className="lms-dash-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {stats.map((st) => {
          const inner = (
            <>
              <span className="lms-stat__icon"><LmsIcon name={st.icon} /></span>
              <span>
                <span className="lms-stat__label">{st.label}</span>
                <span className="lms-stat__value">{st.value}</span>
              </span>
            </>
          );
          return st.to ? (
            <Link key={st.key} to={st.to} className="lms-stat">{inner}</Link>
          ) : (
            <span key={st.key} className="lms-stat is-static">{inner}</span>
          );
        })}
      </div>

      {/* The one piece of work worth surfacing: video without transcripts. */}
      {s.missingTranscripts > 0 ? (
        <section className="lms-card lms-todo" style={{ marginTop: 18 }}>
          <span className="lms-todo__icon">
            <LmsIcon name="text" />
          </span>
          <div className="lms-todo__body">
            <p className="lms-todo__title">
              {s.missingTranscripts} video lesson{s.missingTranscripts === 1 ? '' : 's'} without a transcript
            </p>
            <p className="lms-todo__text">
              Transcripts make lessons searchable and usable without sound, and they’re
              required for accessibility.
            </p>
          </div>
          <Link className="lms-btn lms-btn--primary lms-btn--sm" to="/learn/instructor/courses">
            Review courses
          </Link>
        </section>
      ) : null}

      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="book" />
            Your courses
          </h2>
          <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/instructor/courses">
            View all
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="lms-blank">
            <LmsIcon name="book" className="lms-blank__icon" />
            <h2>No courses yet</h2>
            <p>
              A course is modules, and a module is lessons. Start with the outline. You can
              add video, transcripts and quizzes as you go.
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses/new">
              <LmsIcon name="plus" />
              Create your first course
            </Link>
          </div>
        ) : (
          <div className="lms-list">
            {courses.map((c) => (
              <Link key={c._id} to={`/learn/instructor/courses/${c._id}`} className="lms-list__item">
                <span className="lms-list__icon"><LmsIcon name="book" /></span>
                <span className="lms-list__body">
                  <span className="lms-list__title">{c.title}</span>
                  <span className="lms-list__meta">
                    {c.moduleCount} modules · {c.lessonCount} lessons · {c.learners.toLocaleString('en-AU')} learners
                  </span>
                </span>
                <span className="lms-list__trail">{c.learners?.toLocaleString('en-AU') ?? 0} learners</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
