import { useState } from 'react';
import LmsIcon from '../../components/LmsIcon.jsx';
import StudentAvatar from '../../components/account/StudentAvatar.jsx';
import ProfileForm from '../../components/account/ProfileForm.jsx';
import { saveProfile, useProfile } from '../../hooks/useProfile.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';
import { useProgress } from '../../hooks/useProgress.js';
import { useBadges } from '../../hooks/useBadges.js';

// Student profile (L6): the public half of the account, plus a summary of what
// the learner has done, which is what makes a profile worth visiting.
export default function ProfilePage() {
  const profile = useProfile();
  const { user } = useStudentAuth();
  const { totals } = useProgress();
  const { earned, level, points } = useBadges();
  const [editing, setEditing] = useState(false);

  const name = profile.displayName?.trim() || user?.name || 'Your name';

  const facts = [
    { icon: 'book', value: `${totals.coursesComplete}/${totals.coursesEnrolled}`, label: 'Courses complete' },
    { icon: 'award', value: totals.certificates, label: 'Certificates' },
    { icon: 'badge', value: earned.length, label: 'Badges' },
    { icon: 'chart', value: `${totals.percent}%`, label: 'Overall progress' },
  ];

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Profile</h1>
          <p className="lms-page__subtitle">
            How you appear to other learners on your courses.
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

      <section className="lms-profile">
        <div className="lms-profile__identity">
          <StudentAvatar name={name} size="lg" />
          <div>
            <h2 className="lms-profile__name">{name}</h2>
            {profile.title || profile.organisation ? (
              <p className="lms-profile__role">
                {[profile.title, profile.organisation].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            <p className="lms-profile__level">
              <LmsIcon name="badge" />
              {level.name} · {points} points
            </p>
          </div>
        </div>

        <div className="lms-profile__facts">
          {facts.map((f) => (
            <div className="lms-profile__fact" key={f.label}>
              <LmsIcon name={f.icon} />
              <span className="lms-profile__fact-value">{f.value}</span>
              <span className="lms-profile__fact-label">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {editing ? (
        <section className="lms-card" style={{ marginTop: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="user" />
              Edit profile
            </h2>
          </div>
          <ProfileForm
            profile={profile}
            onCancel={() => setEditing(false)}
            onSave={(next) => {
              saveProfile(next);
              setEditing(false);
            }}
          />
        </section>
      ) : (
        <>
          <section className="lms-card" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="user" />
                About
              </h2>
            </div>
            {profile.bio ? (
              <p className="lms-profile__bio">{profile.bio}</p>
            ) : (
              <p className="lms-empty" style={{ padding: '4px 0' }}>
                Nothing here yet. A line about what you work on helps people answer your
                questions.
              </p>
            )}

            <dl className="lms-profile__details">
              {profile.location ? (
                <div>
                  <dt>Location</dt>
                  <dd>{profile.location}</dd>
                </div>
              ) : null}
              {profile.website ? (
                <div>
                  <dt>Website</dt>
                  <dd>{profile.website}</dd>
                </div>
              ) : null}
              {user?.email ? (
                <div>
                  <dt>Email</dt>
                  <dd>
                    {user.email} <span className="lms-profile__private">private</span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

        </>
      )}
    </div>
  );
}
