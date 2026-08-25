import { useCallback } from 'react';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';

/* ---------------------------------------------------------------------------
   Student profile and settings (L6), from the user record.

   Both were localStorage, and both were seeded — so every account that signed
   up opened its profile page on the same invented person: a Procurement Officer
   at the Department of Finance in Canberra, with a bio about working through
   the practitioner path. One person's details, shown to everyone.

   They live on the User document now and arrive with the session (see
   toSafeJSON), so there is no request here: the shell has already loaded them
   by the time any of these screens render, and a save updates the session copy
   rather than leaving the header quoting the old name.

   Still two things rather than one, because they answer different questions:
   the profile is what other learners see next to your questions and reviews,
   and settings are private preferences that never leave your account.
   ------------------------------------------------------------------------ */

// The defaults every account starts on. A learner who has never opened the
// settings page has an empty map on their record, and a notification toggle
// that reads `undefined` renders as off — which is not the same as never having
// been asked. These are what "not yet chosen" means.
const SETTING_DEFAULTS = {
  // Notifications (R2) — learner side
  emailCourseUpdates: true,
  emailDiscussionReplies: true,
  emailNewCourses: false,
  emailMarketing: false,
  inAppReminders: true,
  inAppDiscussion: true,
  // Notifications — instructor side. Separate keys rather than shared ones,
  // because "a reply to your question" and "a question on your course" are
  // different events and someone who is both should be able to want one
  // without the other.
  emailReviewDecisions: true,
  emailCourseQuestions: true,
  emailNewEnrolments: false,
  emailCourseReviews: true,
  inAppReviews: true,
  inAppEnrolments: true,
  // Learning preferences
  autoplayVideo: false,
  transcriptOpen: true,
  // Authoring preferences
  authorPreviewOnSave: true,
};

export function useProfile() {
  const { user } = useStudentAuth();
  return user?.profile ?? {};
}

export function useSettings() {
  const { user } = useStudentAuth();
  return { ...SETTING_DEFAULTS, ...(user?.settings ?? {}) };
}

/* The savers.

   Both take a PATCH, not the whole object: the settings page writes one toggle
   at a time and the server merges, so two tabs changing different preferences
   do not overwrite each other's. */

export function useSaveProfile() {
  const { saveAccount } = useStudentAuth();
  return useCallback((patch) => saveAccount({ profile: patch }), [saveAccount]);
}

export function useUpdateSetting() {
  const { saveAccount } = useStudentAuth();
  return useCallback(
    (key, value) => saveAccount({ settings: { [key]: value } }),
    [saveAccount],
  );
}
