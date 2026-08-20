import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import PreferencesForm from '../../components/account/PreferencesForm.jsx';
import { updateSetting, useSettings } from '../../hooks/useProfile.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';

const NOTIFICATIONS = [
  { key: 'emailCourseUpdates', label: 'Course updates', hint: 'New lessons, drip releases and schedule changes' },
  { key: 'emailDiscussionReplies', label: 'Replies to your questions', hint: 'When someone answers a discussion you started' },
  { key: 'emailNewCourses', label: 'New course announcements', hint: 'When something is added to the catalogue' },
  { key: 'emailMarketing', label: 'Offers and promotions', hint: 'Discounts, bundles and campaigns' },
];

// Hints describe what the bell ACTUALLY delivers. There is no due-date model
// to remind anyone about, and a vote carries no timestamp to notify on, so
// promising either would be a setting that quietly does nothing.
const IN_APP = [
  { key: 'inAppReminders', label: 'Study reminders', hint: 'A nudge about a course you started and have not been back to' },
  { key: 'inAppDiscussion', label: 'Discussion activity', hint: 'When someone replies to a question you asked' },
];

// Only meaningful to someone who submits courses. Shown to instructors and
// nobody else, rather than offered to every learner as a switch with nothing
// behind it.
const IN_APP_TEACHING = [
  { key: 'inAppReviews', label: 'Course review decisions', hint: 'When an admin approves, sends back or declines a course you submitted' },
];

const LEARNING = [
  { key: 'autoplayVideo', label: 'Autoplay video lessons', hint: 'Start playing as soon as a lesson opens' },
  { key: 'transcriptOpen', label: 'Open transcripts by default', hint: 'Show the transcript panel without having to switch to it' },
];

// Account, notification and privacy settings (L6).
export default function AccountSettingsPage() {
  const settings = useSettings();
  const { user, logout, isAuthenticated, isInstructor } = useStudentAuth();

  const section = (title, icon, fields, note) => (
    <section className="lms-card" style={{ marginTop: 18 }}>
      <div className="lms-card__head">
        <h2 className="lms-card__title">
          <LmsIcon name={icon} />
          {title}
        </h2>
        {note ? <span className="lms-card__note">{note}</span> : null}
      </div>
      <PreferencesForm fields={fields} values={settings} onChange={updateSetting} />
    </section>
  );

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Settings</h1>
          <p className="lms-page__subtitle">
            Your account, and what we notify you about.
          </p>
        </div>
      </div>

      {/* Account ------------------------------------------------------- */}
      <section className="lms-card">
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="user" />
            Account
          </h2>
          <Link className="lms-btn lms-btn--sm lms-btn--ghost" to="/learn/profile">
            Edit profile
          </Link>
        </div>

        <dl className="lms-account">
          <div>
            <dt>Name</dt>
            <dd>{user?.name ?? 'Not signed in'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email ?? '-'}</dd>
          </div>
          <div>
            <dt>Password</dt>
            <dd>
              ••••••••
              <button type="button" className="lms-btn lms-btn--sm" disabled title="Available once student accounts are live">
                Change password
              </button>
            </dd>
          </div>
        </dl>

        <p className="lms-detail__note">
          Your email is the address you sign in with. Changing it needs confirmation from
          both the old and new address.
        </p>
      </section>

      {section('Email notifications', 'mail', NOTIFICATIONS, 'Sent to your account address')}
      {section('In-app notifications', 'chat', isInstructor ? [...IN_APP, ...IN_APP_TEACHING] : IN_APP)}
      {section('Learning preferences', 'book', LEARNING)}

      {/* Account actions ---------------------------------------------- */}
      <section className="lms-card lms-danger" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="lock" />
            Account actions
          </h2>
        </div>

        <div className="lms-danger__row">
          <div>
            <p className="lms-danger__name">Sign out</p>
            <p className="lms-danger__hint">End this session on this device.</p>
          </div>
          <button
            type="button"
            className="lms-btn lms-btn--sm"
            onClick={logout}
            disabled={!isAuthenticated}
          >
            Sign out
          </button>
        </div>

        <div className="lms-danger__row">
          <div>
            <p className="lms-danger__name">Delete account</p>
            <p className="lms-danger__hint">
              Removes your profile, notes and bookmarks. Completed courses and issued
              certificates are retained. They are records of something that happened, and
              an employer may need to verify one.
            </p>
          </div>
          <button type="button" className="lms-btn lms-btn--sm lms-btn--danger" disabled
            title="Available once student accounts are live">
            Delete account
          </button>
        </div>
      </section>
    </div>
  );
}
