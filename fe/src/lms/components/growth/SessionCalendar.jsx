/* A month at a glance, with the days that have a live session on them.

   The card it sits in used to be a list of the next three sessions, which for
   most learners is an empty state most of the time — a card whose usual
   content is the sentence "nothing scheduled". A calendar is worth the same
   space either way: it says which month it is, where today sits in it, and
   whether anything is coming, and it says all three even when the answer to the
   last one is no.

   No month navigation. Paging backwards through a card this size is a control
   nobody would find and a request nobody has made; /learn/live is where the
   full list lives and the card links to it.

   WHICH DAY A SESSION FALLS ON is decided in the SESSION's timezone, not the
   browser's. The rest of the app prints session times through
   formatSessionTime, which formats in `session.timezone` — so a 9am Sydney
   session read from London has to land on the same square as the time the
   learner is shown for it. Reading the day with `new Date(iso).getDate()` would
   put it on the day before. */

// Monday-first: this is an Australian audience and the week starts on Monday
// everywhere else in the product.
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// `YYYY-MM-DD` for an instant, read in a named timezone. `en-CA` is the short
// route to an ISO-shaped date from Intl; the locale is a formatting trick, not
// a language choice.
function dayKeyIn(iso, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      timeZone: timeZone || 'Australia/Sydney',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().slice(0, 10);
  }
}

const localKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* The grid: whole weeks, Monday to Sunday, covering the whole month.

   Five rows or six depending on where the month starts, and the row count is
   allowed to vary rather than being padded to a fixed six. A card that changes
   height by one row between March and April is better than one that carries an
   empty row eleven months of the year. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; shift so Monday is 0.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);

  const cells = [];
  const cursor = new Date(start);
  // Whole weeks until the cursor has passed the end of the month.
  do {
    for (let i = 0; i < 7; i += 1) {
      cells.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  } while (cursor.getMonth() === month && cursor.getFullYear() === year);

  return cells;
}

export default function SessionCalendar({ sessions = [] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = localKey(now);

  /* Which days carry a session, and what kind.

     A day with anything still to come outranks a day whose sessions have all
     finished — one is a thing to plan around, the other is a record. */
  const byDay = new Map();
  sessions.forEach((s) => {
    if (!s?.startsAt) return;
    const key = dayKeyIn(s.startsAt, s.timezone);
    const live = s.state === 'live';
    const upcoming = s.state === 'upcoming';
    const prev = byDay.get(key);
    byDay.set(key, {
      count: (prev?.count ?? 0) + 1,
      live: (prev?.live ?? false) || live,
      upcoming: (prev?.upcoming ?? false) || upcoming,
    });
  });

  const cells = monthGrid(year, month);
  const monthLabel = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  return (
    <div className="lms-cal">
      {/* The month's name is rendered by the CARD, in its heading row, so it
          costs no height of its own — see DashboardPage. The grid still names
          it for anyone reading the page through the accessibility tree. */}
      <div className="lms-cal__grid" role="grid" aria-label={`Live sessions in ${monthLabel}`}>
        {WEEKDAYS.map((d, i) => (
          // The initials repeat (T, T and S, S), so they cannot key on
          // themselves — and they are decorative anyway: every day cell carries
          // its own full date in an aria-label.
          <span className="lms-cal__wd" key={i} aria-hidden="true">{d}</span>
        ))}

        {cells.map((date) => {
          const key = localKey(date);
          const outside = date.getMonth() !== month;
          const mark = outside ? null : byDay.get(key);
          const isToday = key === todayKey;

          const label = date.toLocaleDateString('en-AU', {
            weekday: 'long', day: 'numeric', month: 'long',
          });

          return (
            <span
              key={key}
              className={[
                'lms-cal__day',
                outside ? 'is-outside' : '',
                isToday ? 'is-today' : '',
                mark ? (mark.live ? 'has-live' : mark.upcoming ? 'has-upcoming' : 'has-past') : '',
              ].filter(Boolean).join(' ')}
              aria-label={
                mark
                  ? `${label}: ${mark.count} live session${mark.count === 1 ? '' : 's'}`
                  : label
              }
            >
              {date.getDate()}
              {mark ? <span className="lms-cal__dot" aria-hidden="true" /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
