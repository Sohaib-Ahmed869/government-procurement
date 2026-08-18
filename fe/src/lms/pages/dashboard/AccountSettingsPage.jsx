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

const IN_APP = [
  { key: 'inAppReminders', label: 'Study reminders', hint: 'A nudge when an assessment is due' },
  { key: 'inAppDiscussion', label: 'Discussion activity', hint: 'Replies and votes on your posts' },
];

const LEARNING = [
  { key: 'autoplayVideo', label: 'Autoplay video lessons', hint: 'Start playing as soon as a lesson opens' },
  { key: 'transcriptOpen', label: 'Open transcripts by default', hint: 'Show the transcript panel without having to switch to it' },
  { key: 'reduceMotion', label: 'Reduce motion', hint: 'Minimise animation across the LMS' },
];

const PRIVACY = [
  { key: 'publicProfile', label: 'Public profile', hint: 'Let other learners on your courses see your profile' },
  { key: 'showInStandings', label: 'Show me in badge standings', hint: 'Appear in the leaderboard on the Badges page' },
];

// Account, notification and privacy settings (L6).
export default function AccountSettingsPage() {
  const settings = useSettings();
  const { user, logout, isAuthenticated } = useStudentAuth();

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
            Your account, what we email you about, and who can see what.
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
      {section('In-app notifications', 'chat', IN_APP)}
      {section('Learning preferences', 'book', LEARNING)}
      {section('Privacy', 'lock', PRIVACY, 'Applies across the LMS')}

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
