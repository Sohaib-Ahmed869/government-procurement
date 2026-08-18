import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { useInstructorCourses } from '../../hooks/useInstructor.js';
import { formatMoney } from '../../utils/money.js';
import { STATUS_LABEL } from '../../hooks/useAuthoring.js';

// The instructor's course list (R1). Built around the two questions an author
// actually has: is this course finished, and is anyone learning from it?
export default function InstructorCoursesPage() {
  const { courses, status } = useInstructorCourses();

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">My Courses</h1>
          <p className="lms-page__subtitle">
            Everything you’re teaching, with its structure and how it’s performing.
          </p>
        </div>
        <div className="lms-page__actions">
          <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses/new">
            <LmsIcon name="plus" />
            New course
          </Link>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="lms-card"><p className="lms-empty">Loading your courses…</p></div>
      ) : courses.length === 0 ? (
        <div className="lms-card">
          <div className="lms-blank">
            <LmsIcon name="book" className="lms-blank__icon" />
            <h2>You haven’t built a course yet</h2>
            <p>
              Start with the outline: title, modules and lessons. Video, transcripts and
              quizzes can come after, and nothing is visible to learners until you publish.
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses/new">
              <LmsIcon name="plus" />
              Create a course
            </Link>
          </div>
        </div>
      ) : (
        <div className="lms-instructor-courses">
          {courses.map((c) => (
            <article className="lms-icourse" key={c._id}>
              <div className="lms-icourse__head">
                <div className="lms-icourse__id">
                  <span className={`lms-icourse__thumb is-accent-${(c.accent ?? 0) % 6}`} aria-hidden="true">
                    <LmsIcon name="book" />
                  </span>
                  <div>
                    <h2 className="lms-icourse__title">
                      <Link to={`/learn/instructor/courses/${c._id}`}>{c.title}</Link>
                    </h2>
                    <p className="lms-icourse__meta">
                      {c.levelLabel} · {c.durationLabel} ·{' '}
                      {c.price ? formatMoney(c.price) : 'Free'}
                    </p>
                  </div>
                </div>
                <span className={`lms-pill lms-status is-${c.state}`}>
                  {STATUS_LABEL[c.state] ?? 'Draft'}
                </span>
              </div>

              {/* Structure at a glance. What exists and what's missing. */}
              <ul className="lms-icourse__stats">
                <li>
                  <LmsIcon name="modules" />
                  <strong>{c.moduleCount}</strong> modules
                </li>
                <li>
                  <LmsIcon name="lessons" />
                  <strong>{c.lessonCount}</strong> lessons
                </li>
                <li>
                  <LmsIcon name="video" />
                  <strong>{c.videoCount}</strong> videos
                </li>
                <li>
                  <LmsIcon name="quiz" />
                  <strong>{c.quizCount}</strong> quizzes
                </li>
                <li className={c.transcriptCount < c.videoCount ? 'is-warn' : undefined}>
                  <LmsIcon name="text" />
                  <strong>
                    {c.transcriptCount}/{c.videoCount}
                  </strong>{' '}
                  transcripts
                </li>
              </ul>

              <div className="lms-icourse__foot">
                <div className="lms-icourse__perf">
                  <span>
                    <LmsIcon name="users" />
                    <strong>{c.learners.toLocaleString('en-AU')}</strong> enrolled
                  </span>
                  <span>
                    <LmsIcon name="check" />
                    <strong>{c.completionRate}%</strong> completing
                  </span>
                  {c.rating != null ? (
                    <span>
                      <LmsIcon name="star" />
                      <strong>{c.rating.toFixed(1)}</strong> ({c.ratingCount})
                    </span>
                  ) : (
                    <span>
                      <LmsIcon name="star" />
                      No ratings yet
                    </span>
                  )}
                </div>

                <div className="lms-icourse__actions">
                  {/* Straight to this course's learners under Enrolments,
                      rather than a second roster screen that would have to be
                      kept in step with it. */}
                  <Link className="lms-btn lms-btn--sm" to={`/learn/instructor/students/${c._id}`}>
                    <LmsIcon name="users" />
                    Students
                  </Link>
                  <Link className="lms-btn lms-btn--sm lms-btn--primary" to={`/learn/instructor/courses/${c._id}`}>
                    <LmsIcon name="note" />
                    Edit course
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
