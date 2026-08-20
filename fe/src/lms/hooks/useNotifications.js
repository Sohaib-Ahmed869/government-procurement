import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { authoringApi, discussionsApi, enrollmentsApi } from '../../api/lms.js';
import { createStore } from '../utils/localStore.js';
import { useSettings } from './useProfile.js';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';

/* ---------------------------------------------------------------------------
   In-app notifications (R2).

   DERIVED, not stored. There is no notification table and no endpoint that
   emits one; every item below is computed from records the LMS already keeps:
   a reply on a thread you started, a course you began and stopped. That is a
   deliberate choice rather than a shortcut.

     · nothing can be notified about that isn't already true in the data, so a
       notification can never survive the thing it describes being deleted;
     · no fan-out to write, no backfill for existing learners, and no second
       copy of the truth to keep in step with the first.

   What it costs is push. Nothing arrives while a page is open unless something
   refetches, so this polls on an interval and refreshes when the panel opens.

   TODO: when a notifications endpoint exists, replace `derive()` with it and
   keep the read-state store below. The shape each item takes is the contract.
   ------------------------------------------------------------------------ */

// Which items the learner has already seen. Ids only, so this stays small and
// survives the underlying record changing.
const readStore = createStore('gp.lms.notifications.read');

// How long a course sits untouched before it is worth mentioning. A day would
// be nagging; a month is too late to be a nudge.
const STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const POLL_MS = 2 * 60 * 1000;

function useReadIds() {
  const rows = useSyncExternalStore(readStore.subscribe, readStore.read, readStore.read);
  return useMemo(() => new Set(rows), [rows]);
}

// Read ids are pruned against the items that currently exist. Without this the
// list grows forever: a thread deleted two years ago would keep its id here.
function persistRead(ids, liveIds) {
  readStore.write([...new Set(ids)].filter((id) => liveIds.has(id)));
}

/* Replies from other people on threads THIS learner started.
   `mine` is decided by the server on both the thread and each reply, so the
   client never has to guess whose post is whose. Your own replies to your own
   thread are not news, hence the second check. */
function replyItems(threads) {
  return threads
    .filter((t) => t.mine)
    .flatMap((t) =>
      (t.replies ?? [])
        .filter((r) => !r.mine)
        .map((r) => ({
          id: `reply:${r.id}`,
          kind: 'discussion',
          icon: 'chat',
          at: r.createdAt,
          title: `${r.author} replied to your question`,
          detail: t.title,
          context: t.courseTitle,
          to: `/learn/discussions/${t.id}`,
        })),
    );
}

/* A course started and then left alone. `at` is the moment it BECAME stale,
   not the moment it was last opened, so it sorts into the timeline where the
   nudge actually belongs and doesn't claim to be a week old the second it
   appears.

   The id carries lastAccessedAt, so returning to the course and stopping again
   raises a new reminder rather than reusing one already dismissed. */
function resumeItems(enrolments) {
  const now = Date.now();
  return enrolments
    .filter((e) => e.course && e.lastAccessedAt && e.percent > 0 && e.percent < 100)
    .filter((e) => now - Date.parse(e.lastAccessedAt) > STALE_DAYS * DAY_MS)
    .map((e) => ({
      id: `resume:${e.course.slug}:${e.lastAccessedAt}`,
      kind: 'reminder',
      icon: 'clock',
      at: new Date(Date.parse(e.lastAccessedAt) + STALE_DAYS * DAY_MS).toISOString(),
      title: 'Pick up where you left off',
      detail: e.next?.title ? `Next: ${e.next.title}` : `${e.percent}% complete`,
      context: e.course.title,
      to: `/learn/courses/${e.course.slug}`,
    }));
}

/* The outcome of a course review (R1), for the instructor who submitted it.

   An admin's decision already lives on the course, in reviewStatus, reviewedAt
   and the note they wrote, so this reads it rather than needing the review
   handlers to emit anything.

   Only the three DECIDED states qualify. 'pending' is the instructor's own
   action and 'none' covers two cases that are explicitly not news: a course
   never submitted, and one whose author has started editing after it was sent
   back. updateCourse() clears 'rejected' to 'none' at that point, and telling
   somebody about a rejection they are already fixing is noise.

   reviewedAt is in the id, so a resubmission that gets a second decision raises
   a new notification instead of reusing one already dismissed. */
const DECISIONS = {
  approved: {
    icon: 'check',
    title: 'Your course was approved and published',
  },
  rejected: {
    icon: 'note',
    title: 'Changes requested on your course',
  },
  declined: {
    icon: 'lock',
    title: 'Your course was not accepted',
  },
};

function reviewItems(courses) {
  return courses
    .filter((c) => c.reviewedAt && DECISIONS[c.reviewStatus])
    .map((c) => {
      const decision = DECISIONS[c.reviewStatus];
      return {
        id: `review:${c._id}:${c.reviewedAt}`,
        kind: 'review',
        icon: decision.icon,
        at: c.reviewedAt,
        title: decision.title,
        // The reviewer's note is the whole point of a rejection, so it is the
        // line shown rather than something the instructor has to click to find.
        detail: c.reviewNote || c.title,
        context: c.reviewNote ? c.title : null,
        to: `/learn/instructor/courses/${c._id}`,
      };
    });
}

export function useNotifications() {
  const settings = useSettings();
  const readIds = useReadIds();
  const { isInstructor } = useStudentAuth();

  const [data, setData] = useState({ threads: [], enrolments: [], courses: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Both toggles off means there is nothing to compute, so nothing is fetched.
  // A learner who turned these off should not be generating requests for them.
  const wantsDiscussion = settings.inAppDiscussion !== false;
  const wantsReminders = settings.inAppReminders !== false;
  // Review outcomes only exist for someone who submits courses, so this is
  // gated on the role as well as the preference. A learner has no authored
  // courses and the endpoint would refuse them anyway.
  const wantsReviews = isInstructor && settings.inAppReviews !== false;
  const enabled = wantsDiscussion || wantsReminders || wantsReviews;

  const load = useCallback(async () => {
    if (!enabled) {
      setData({ threads: [], enrolments: [], courses: [] });
      setStatus('ready');
      return;
    }
    try {
      // Settled rather than all: a learner with no enrolments still deserves
      // their replies, and one endpoint being down shouldn't empty the bell.
      const [threads, enrolments, courses] = await Promise.allSettled([
        wantsDiscussion ? discussionsApi.list() : Promise.resolve([]),
        wantsReminders ? enrollmentsApi.mine() : Promise.resolve([]),
        wantsReviews ? authoringApi.myCourses() : Promise.resolve([]),
      ]);
      setData({
        threads: threads.status === 'fulfilled' ? (threads.value ?? []) : [],
        enrolments: enrolments.status === 'fulfilled' ? (enrolments.value ?? []) : [],
        courses: courses.status === 'fulfilled' ? (courses.value ?? []) : [],
      });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [enabled, wantsDiscussion, wantsReminders, wantsReviews]);

  useEffect(() => {
    load();
    if (!enabled) return undefined;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load, enabled]);

  const items = useMemo(() => {
    const rows = [
      ...(wantsDiscussion ? replyItems(data.threads) : []),
      ...(wantsReminders ? resumeItems(data.enrolments) : []),
      ...(wantsReviews ? reviewItems(data.courses) : []),
    ];
    return rows
      .map((r) => ({ ...r, read: readIds.has(r.id) }))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [data, readIds, wantsDiscussion, wantsReminders, wantsReviews]);

  const liveIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const markRead = useCallback(
    (id) => persistRead([...readIds, id], liveIds),
    [readIds, liveIds],
  );

  const markAllRead = useCallback(
    () => persistRead([...readIds, ...liveIds], liveIds),
    [readIds, liveIds],
  );

  return {
    items,
    unread: items.filter((i) => !i.read).length,
    status,
    enabled,
    reload: load,
    markRead,
    markAllRead,
  };
}
