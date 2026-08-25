import { activityApi } from '../../api/lms.js';
import { useApi } from './useApi.js';

/* ---------------------------------------------------------------------------
   Day-by-day study history (L3), from the API.

   The dashboard's week strip and the My Progress chart both ran on
   WEEK_ACTIVITY / QUARTER_ACTIVITY — two hardcoded arrays, the same numbers for
   every learner, and unchanged by anything they did. A learner who had finished
   nothing was shown a solid week of study.

   The server returns the range already zero-filled and already ending on the
   learner's own today, so the strip and the chart cannot disagree about which
   column is "today" — see study.controller.js for why that date is the
   server's business rather than this file's.
   ------------------------------------------------------------------------ */

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The chart takes { label, minutes }. Parsed as UTC and read back as UTC: the
// day string is already the learner's local day, and letting the browser
// re-interpret it in its own timezone is what puts Monday's total under Sunday.
function toChart(rows) {
  const lastIndex = rows.length - 1;
  return rows.map((row, i) => {
    const date = new Date(`${row.day}T00:00:00Z`);
    return {
      day: row.day,
      label: DAY_LABEL[date.getUTCDay()],
      dayOfMonth: date.getUTCDate(),
      minutes: row.minutes,
      lessons: row.lessons,
      quizzes: row.quizzes,
      // The window always ends on the learner's today, so the last column is it.
      current: i === lastIndex,
    };
  });
}

// Consecutive days with activity, counting back from the most recent day.
function countStreak(rows) {
  let n = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if ((rows[i].minutes || 0) > 0 || (rows[i].quizzes || 0) > 0) n += 1;
    else break;
  }
  return n;
}

export function useActivity(days = 7) {
  const { data, status, error, reload } = useApi(() => activityApi.mine(days), [days]);
  const rows = data ?? [];

  return {
    activity: toChart(rows),
    // Totals over the window, so a caller does not add up the same array twice
    // and get it wrong once.
    minutes: rows.reduce((sum, r) => sum + (r.minutes || 0), 0),
    lessons: rows.reduce((sum, r) => sum + (r.lessons || 0), 0),
    // Consecutive days with something on them, counting back from today. A
    // streak is the one figure here that has to be read from the end.
    streak: countStreak(rows),
    status,
    error,
    reload,
  };
}
