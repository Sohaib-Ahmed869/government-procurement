import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { authoringApi, enrollmentsApi, notificationsApi } from '../../api/lms.js';
import { createStore } from '../utils/localStore.js';
import { useSettings } from './useProfile.js';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';

/* ---------------------------------------------------------------------------
   In-app notifications (R2). TWO SOURCES, one list.

   EMITTED — discussion replies, and new questions on a course you teach. These
   are rows the server writes when the thing happens (be/src/models/
   Notification.js), and their read state lives on the record.

   DERIVED — study reminders and course review decisions. These are still
   computed here from records the LMS already keeps, because nothing emits them:
   "you started this and stopped" is not an event, it is the absence of one. A
   server-side notification would need a scheduled job to notice it, which is a
   bigger thing than the nudge deserves. Their read state stays in localStorage,
   since there is no record to hang it off.

   This file used to derive EVERYTHING, including replies. That could not work
   past a point, and the reasons are worth keeping written down:

     · read state in localStorage does not follow the account. A reply dismissed
       on a laptop was unread again on a phone;
     · deriving only ever notices what the reader can already fetch, which is
       why an instructor was never told a question was waiting. Nothing they
       poll says "this arrived while you were away";
     · nothing could be emailed, because there was no moment to send from.

   What has NOT changed is the shape of an item. The server renders the same
   { id, kind, icon, at, title, detail, context, to } the derived kinds produce,
   so both sources sort into one timeline and the menu cannot tell them apart.
   Only `source` distinguishes them, and only so a dismissal goes to the right
   place.

   Still polled. Nothing is pushed, so this refetches on an interval and
   whenever the panel is opened.
   ------------------------------------------------------------------------ */

/* Which DERIVED items have been seen. Ids only, so this stays small.

   Emitted items are no longer written here — they carry `readAt` on the record
   instead. Anything left over from when they were (ids like "reply:abc") is
   pruned on the next write by persistRead, which drops whatever is no longer
   live. No migration needed; it clears itself. */
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

// Read ids are pruned against the derived items that currently exist. Without
// this the list grows forever: a reminder raised two years ago would keep its id
// here.
function persistRead(ids, liveIds) {
  readStore.write([...new Set(ids)].filter((id) => liveIds.has(id)));
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

const NO_SERVER = { items: [], unread: 0 };

export function useNotifications() {
  const settings = useSettings();
  const readIds = useReadIds();
  const { isInstructor } = useStudentAuth();

  const [server, setServer] = useState(NO_SERVER);
  const [derived, setDerived] = useState({ enrolments: [], courses: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Every toggle off means there is nothing to show, so nothing is fetched. A
  // learner who turned these off should not be generating requests for them.
  const wantsDiscussion = settings.inAppDiscussion !== false;
  const wantsReminders = settings.inAppReminders !== false;
  // Review outcomes only exist for someone who submits courses, so this is
  // gated on the role as well as the preference. A learner has no authored
  // courses and the endpoint would refuse them anyway.
  const wantsReviews = isInstructor && settings.inAppReviews !== false;
  const enabled = wantsDiscussion || wantsReminders || wantsReviews;

  const load = useCallback(async () => {
    if (!enabled) {
      setServer(NO_SERVER);
      setDerived({ enrolments: [], courses: [] });
      setStatus('ready');
      return;
    }
    try {
      // Settled rather than all: a learner with no enrolments still deserves
      // their replies, and one endpoint being down shouldn't empty the bell.
      const [rows, enrolments, courses] = await Promise.allSettled([
        wantsDiscussion ? notificationsApi.list() : Promise.resolve(NO_SERVER),
        wantsReminders ? enrollmentsApi.mine() : Promise.resolve([]),
        wantsReviews ? authoringApi.myCourses() : Promise.resolve([]),
      ]);
      setServer(rows.status === 'fulfilled' ? (rows.value ?? NO_SERVER) : NO_SERVER);
      setDerived({
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

  /* The derived half, with its browser-held read state. Kept separate from the
     merged list below because these are also the only ids persistRead may
     write — pruning against the merged set would keep emitted ids alive in
     localStorage forever. */
  const localItems = useMemo(() => {
    const rows = [
      ...(wantsReminders ? resumeItems(derived.enrolments) : []),
      ...(wantsReviews ? reviewItems(derived.courses) : []),
    ];
    return rows.map((r) => ({ ...r, source: 'local', read: readIds.has(r.id) }));
  }, [derived, readIds, wantsReminders, wantsReviews]);

  const localIds = useMemo(() => new Set(localItems.map((i) => i.id)), [localItems]);

  const items = useMemo(() => {
    const emitted = (server.items ?? []).map((r) => ({ ...r, source: 'server' }));
    return [...emitted, ...localItems].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [server, localItems]);

  /* The badge counts the server's OWN unread total, not the unread rows in
     `items`. The list is capped at fifty and the count is not, so deriving one
     from the other is how a bell gets stuck saying "50". */
  const unread = server.unread + localItems.filter((i) => !i.read).length;

  const markRead = useCallback(
    async (id) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.read) return;

      if (item.source !== 'server') {
        persistRead([...readIds, id], localIds);
        return;
      }

      // Applied here first, then sent. Following a notification navigates away
      // in the same breath, and a row that stays bold until the next poll reads
      // as though the click did nothing.
      setServer((s) => ({
        items: (s.items ?? []).map((i) => (i.id === id ? { ...i, read: true } : i)),
        unread: Math.max(0, s.unread - 1),
      }));

      try {
        await notificationsApi.markRead([id]);
      } catch {
        // Put the truth back rather than leaving the optimistic guess standing.
        load();
      }
    },
    [items, readIds, localIds, load],
  );

  const markAllRead = useCallback(async () => {
    persistRead([...readIds, ...localIds], localIds);
    if (!server.unread && !(server.items ?? []).some((i) => !i.read)) return;

    setServer((s) => ({
      items: (s.items ?? []).map((i) => ({ ...i, read: true })),
      unread: 0,
    }));
    try {
      await notificationsApi.markAllRead();
    } catch {
      load();
    }
  }, [readIds, localIds, server, load]);

  return {
    items,
    unread,
    status,
    enabled,
    reload: load,
    markRead,
    markAllRead,
  };
}
