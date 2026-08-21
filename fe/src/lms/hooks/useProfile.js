import { useSyncExternalStore } from 'react';
import { createStore } from '../utils/localStore.js';

/* ---------------------------------------------------------------------------
   Student profile and settings (L6).

   Two separate stores because they answer different questions: the profile is
   what other learners see next to your questions and reviews, and settings are
   private preferences that never leave your account.

   TODO: both belong on the user record. `authApi.updateMe()` already exists
   for the CMS and is the natural home. Held locally until the student account
   model lands, so changes here do not follow you to another device.
   ------------------------------------------------------------------------ */

// createStore holds arrays; these are single objects, so they live at index 0.
const profileStore = createStore('gp.lms.profile');
const settingsStore = createStore('gp.lms.settings');

profileStore.seedOnce([
  {
    displayName: '',
    title: 'Procurement Officer',
    organisation: 'Department of Finance',
    location: 'Canberra, ACT',
    bio: 'Working through the practitioner path. Mostly interested in evaluation and the record-keeping side of things.',
    website: '',
  },
]);

settingsStore.seedOnce([
  {
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
  },
]);

export function useProfile() {
  const rows = useSyncExternalStore(profileStore.subscribe, profileStore.read, profileStore.read);
  return rows[0] ?? {};
}

export function saveProfile(next) {
  profileStore.write([{ ...(profileStore.read()[0] ?? {}), ...next }]);
}

export function useSettings() {
  const rows = useSyncExternalStore(settingsStore.subscribe, settingsStore.read, settingsStore.read);
  return rows[0] ?? {};
}

export function updateSetting(key, value) {
  settingsStore.write([{ ...(settingsStore.read()[0] ?? {}), [key]: value }]);
}
