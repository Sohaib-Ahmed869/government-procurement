import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import StudentAvatar from '../../components/account/StudentAvatar.jsx';
import InstructorProfileForm from '../../components/account/InstructorProfileForm.jsx';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { authoringApi } from '../../../api/lms.js';

// The instructor's own profile (R1).
//
// A separate page from the learner's, not a variant of it. The learner's asks
// "how far have you got"; this one asks "what have you published, who did it
// reach, and what did they think", four different numbers from four different
// records. Sharing one component meant an instructor being shown 0/0 courses
// complete and 0 certificates, which is true and tells them nothing.
//
// The identity half is also genuinely different: a learner's profile is stored
// in their own browser, whereas this is the byline printed beside their courses
// on the public site, so it lives on the server.
export default function InstructorProfilePage() {
  const { user, instructor, saveInstructorProfile } = useStudentAuth();
  const { data, status, reload } = useApi(() => authoringApi.profileSummary(), []);
  const [editing, setEditing] = useState(false);

  const name = user?.name ?? 'Your name';
  const byline = [instructor?.headline, instructor?.organisation].filter(Boolean).join(' · ');

  // A dash, not a zero, until the numbers land. A profile that renders "0
  // learners" for a second and then corrects itself has already told the author
  // something untrue about their own work.
  const loading = status === 'loading';
  const n = (value) => (loading ? '…' : value);

  const rating = data?.rating;
  const facts = [
    {
      icon: 'book',
      value: n(data?.courses?.published ?? 0),
      label: 'Courses published',
      // Work in progress is worth surfacing here, but as context rather than as
      // an achievement: it is the difference between "I have one course" and
      // "I have one course and three nearly ready".
      note:
        !loading && data?.courses?.total > (data?.courses?.published ?? 0)
          ? `${data.courses.total - data.courses.published} not yet live`
          : null,
    },
    {
      icon: 'users',
      value: n(data?.learners ?? 0),
      label: 'Learners taught',
      note:
        !loading && data?.enrolments > data?.learners
          ? `${data.enrolments} enrolments`
          : null,
    },
    {
      icon: 'award',
      value: n(data?.completions ?? 0),
      label: 'Completions',
      note: null,
    },
    {
      icon: 'star',
      // No rating and a rating of zero are different things, and only one of
      // them is an insult to a course nobody has reviewed yet.
      value: loading ? '…' : rating?.average != null ? rating.average.toFixed(1) : 'No ratings',
      label: 'Average rating',
      note: !loading && rating?.count ? `from ${rating.count} review${rating.count === 1 ? '' : 's'}` : null,
    },
  ];

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Profile</h1>
          <p className="lms-page__subtitle">
            How you appear to learners deciding whether to take your courses.
          </p>
        </div>
        {!editing ? (
          <div className="lms-page__actions">
            <button type="button" className="lms-btn lms-btn--primary" onClick={() => setEditing(true)}>
              <LmsIcon name="note" />
              Edit profile
            </button>
          </div>
        ) : null}
      </div>

      {instructor?.status === 'suspended' ? (
        <p className="lms-alert lms-alert--error" style={{ marginBottom: 16 }}>
          This account is suspended, so your courses are not accepting new submissions.
          Contact an administrator.
        </p>
      ) : null}

      <section className="lms-profile">
        <div className="lms-profile__identity">
          <StudentAvatar name={name} size="lg" />
          <div>
            <h2 className="lms-profile__name">{name}</h2>
            {byline ? <p className="lms-profile__role">{byline}</p> : null}
            <p className="lms-profile__level">
              <LmsIcon name="user" />
              Instructor
            </p>
          </div>
        </div>

        <div className="lms-profile__facts">
          {facts.map((f) => (
            <div className="lms-profile__fact" key={f.label}>
              <LmsIcon name={f.icon} />
              <span className="lms-profile__fact-value">{f.value}</span>
              <span className="lms-profile__fact-label">{f.label}</span>
              {f.note ? <span className="lms-profile__fact-note">{f.note}</span> : null}
            </div>
          ))}
        </div>
      </section>

      {status === 'error' ? (
        <p className="lms-empty" style={{ marginTop: 18 }}>
          Couldn’t load your teaching stats.{' '}
          <button type="button" className="lms-linkbtn" onClick={reload}>Try again</button>
        </p>
      ) : null}

      {editing ? (
        <section className="lms-card" style={{ marginTop: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="user" />
              Edit profile
            </h2>
          </div>
          <InstructorProfileForm
            profile={instructor}
            onCancel={() => setEditing(false)}
            onSave={async (next) => {
              await saveInstructorProfile(next);
              setEditing(false);
            }}
          />
        </section>
      ) : (
        <section className="lms-card" style={{ marginTop: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="user" />
              About
            </h2>
          </div>

          {instructor?.bio ? (
            <p className="lms-profile__bio">{instructor.bio}</p>
          ) : (
            <p className="lms-empty" style={{ padding: '4px 0' }}>
              Nothing here yet. Learners read this before they enrol. A few lines on what
              you have done in procurement is the part that persuades them.
            </p>
          )}

          <dl className="lms-profile__details">
            <div>
              <dt>Headline</dt>
              <dd>{instructor?.headline || <span className="lms-profile__unset">Not set</span>}</dd>
            </div>
            <div>
              <dt>Organisation</dt>
              <dd>{instructor?.organisation || <span className="lms-profile__unset">Not set</span>}</dd>
            </div>
            {user?.email ? (
              <div>
                <dt>Email</dt>
                <dd>
                  {user.email} <span className="lms-profile__private">private</span>
                </dd>
              </div>
            ) : null}
          </dl>

          {/* The note explains, the button acts. They were one sentence with a
              link buried at the end of it, which read as a footnote rather than
              as the way through to the thing being described. */}
          <div className="lms-composer__actions" style={{ marginTop: 16 }}>
            <span className="lms-composer__hint">
              Your headline, organisation and bio are printed beside your courses on the
              public site.
            </span>
            <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/instructor/courses">
              <LmsIcon name="book" />
              Your courses
              <LmsIcon name="arrow" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
