import { useCallback } from 'react';
import { liveApi } from '../../api/lms.js';
import { useApi } from './useApi.js';

/* ---------------------------------------------------------------------------
   Live teaching sessions (LMS 17.0b), from the API.

   The one rule worth keeping in mind while editing this file: a join URL is
   never held in state. `openJoinLink` fetches it and navigates in the same
   breath, so there is no moment where a link is sitting in a component that
   React might re-render into somebody's screen share, and no cached URL that
   outlives the enrolment it was granted under.

   Whether a session is upcoming, live or over is decided SERVER-side and read
   here, for the same reason lesson gating is: a client that decides the room is
   open is a client that can let itself in early.
   ------------------------------------------------------------------------ */

// ---- Learner ----------------------------------------------------------------

export function useLiveSessions() {
  const { data, status, error, reload } = useApi(() => liveApi.mine(), []);
  const sessions = data ?? [];

  return {
    sessions,
    // Split rather than filtered at the call site, because every screen that
    // shows these wants the same two groups and would otherwise each invent
    // their own definition of "past".
    upcoming: sessions.filter((s) => s.state === 'upcoming' || s.state === 'live'),
    past: sessions.filter((s) => s.state === 'ended' || s.state === 'cancelled'),
    status,
    error,
    reload,
  };
}

/* Fetches a one-click join URL and opens it.

   `window.open` in a new tab rather than replacing the page: a learner leaving
   for Zoom should still have the LMS behind them when the session ends. The
   call has to be the direct result of the click for the popup blocker to allow
   it — which is why this awaits and then opens, rather than being wrapped in
   anything that defers. */
export function useJoinSession() {
  return useCallback(async (sessionId) => {
    const { url } = await liveApi.join(sessionId);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);
}

// ---- Instructor -------------------------------------------------------------

export function useAuthoredSessions() {
  const { data, status, error, reload } = useApi(() => liveApi.authored(), []);
  return { sessions: data ?? [], status, error, reload };
}

// Whether scheduling can work at all. Read once per screen so the Schedule form
// can explain itself instead of failing on submit.
export function useLiveStatus() {
  const { data, status, error } = useApi(() => liveApi.status(), []);
  return { live: data ?? { ready: false }, status, error };
}

// ---- Formatting -------------------------------------------------------------

/* Times are rendered in the SESSION'S timezone, not the reader's.

   Deliberate: a session is an event at a place and hour the instructor chose,
   and "10am Sydney" is how it will be spoken about in the course. Showing a
   Perth learner "8am" with no zone attached is how people miss things — so the
   zone is always printed alongside. */
export function formatSessionTime(iso, timezone) {
  try {
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: timezone || 'Australia/Sydney',
    }).format(new Date(iso));
  } catch {
    // An unknown IANA name should show the time, not blank the row.
    return new Date(iso).toLocaleString('en-AU');
  }
}

/* Just the clock time, for somewhere the DATE is already on screen.

   The dashboard's calendar shows which day a session falls on, so repeating
   "Mon, 31 Aug" beside it is the same fact twice — and on a card this size the
   second telling costs a line the calendar needs. Same timezone rule as
   formatSessionTime: the session's own zone, not the reader's. */
export function formatSessionClock(iso, timezone) {
  try {
    return new Intl.DateTimeFormat('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: timezone || 'Australia/Sydney',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  }
}

// "in 3 days", "in 2 hours", "in 12 minutes". Rounded generously — a countdown
// to the second is a distraction on a page nobody is watching a clock on.
export function relativeTo(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return '';
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}
