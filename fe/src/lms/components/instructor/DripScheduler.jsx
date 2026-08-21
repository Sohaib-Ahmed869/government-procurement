import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import {
  dripDateLabel,
  dripDateToIso,
  dripModeOf,
  isoToDripDate,
} from '../../utils/gating.js';

/* ---------------------------------------------------------------------------
   Drip scheduling for one module (L4).

   A module opens either straight away, on a fixed date, or a number of days
   after THAT learner enrolled. Three states, one control, because they are
   three answers to a single question — "when does this open?" — and offering
   two independent fields invites an author to fill in both.

   Both cannot be set at once, and that is not a UI nicety. gateFor() on the
   server applies every schedule it finds on a module, so one carrying a date
   AND a day count stays shut until both have passed — a rule nobody writes on
   purpose and one an author cannot see from the fields. Picking a mode here
   sends the other field back as null, and the server clears it too.

   Days-after-enrolment is the mode most cohorts actually want: it works for
   somebody who joins in week three, where a fixed date would hand them four
   modules at once. The fixed date is for a real intake everyone starts on.
   ------------------------------------------------------------------------ */

const MODES = [
  { value: 'now', label: 'Right away' },
  { value: 'date', label: 'On a date' },
  { value: 'days', label: 'After enrolling' },
];

export default function DripScheduler({ module: mod, onChange, onClose }) {
  const saved = dripModeOf(mod);
  // Held locally so switching to a mode whose field is still empty doesn't
  // immediately save a half-written schedule.
  const [mode, setMode] = useState(saved);
  const [days, setDays] = useState(mod.releaseAfterDays ? String(mod.releaseAfterDays) : '7');

  const dateValue = isoToDripDate(mod.releaseAt);

  const pickMode = (next) => {
    setMode(next);
    // "Right away" is the only mode that can be applied without a value, so it
    // saves on the click. The other two wait for the field beside them.
    if (next === 'now' && saved !== 'now') {
      onChange({ releaseAt: null, releaseAfterDays: null });
    }
  };

  const setDate = (ymd) => {
    // Clearing the picker drops the module back to opening on enrolment rather
    // than leaving it on a schedule the field no longer shows.
    onChange(
      ymd
        ? { releaseAt: dripDateToIso(ymd), releaseAfterDays: null }
        : { releaseAt: null, releaseAfterDays: null },
    );
  };

  const commitDays = () => {
    const n = Number(days);
    // 0 days after enrolling IS "right away", and gateFor() reads it as no drip
    // at all, so the form doesn't pretend it is a schedule.
    if (!Number.isInteger(n) || n < 1) {
      setDays(mod.releaseAfterDays ? String(mod.releaseAfterDays) : '7');
      return;
    }
    onChange({ releaseAfterDays: n, releaseAt: null });
  };

  return (
    <div className="lms-drip">
      <div className="lms-drip__head">
        <span className="lms-drip__label">
          <LmsIcon name="clock" />
          When does this module open?
        </span>
        <button type="button" className="lms-iconbtn" onClick={onClose} aria-label="Close schedule">
          <LmsIcon name="plus" className="lms-rotate45" />
        </button>
      </div>

      <div className="lms-drip__modes" role="group" aria-label="Release schedule">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className={`lms-drip__mode${mode === m.value ? ' is-on' : ''}`}
            aria-pressed={mode === m.value}
            onClick={() => pickMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'date' ? (
        <label className="lms-drip__field">
          <span className="lms-drip__hint">Everyone gets it on this date.</span>
          <input
            type="date"
            className="lms-input lms-drip__input"
            value={dateValue}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      ) : null}

      {mode === 'days' ? (
        <label className="lms-drip__field">
          <span className="lms-drip__hint">
            Counted from each learner’s own enrolment, so somebody who joins late
            still starts at the beginning.
          </span>
          <span className="lms-drip__days">
            <input
              type="number"
              min="1"
              step="1"
              className="lms-input lms-drip__input"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              onBlur={commitDays}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
            <span>days after enrolling</span>
          </span>
        </label>
      ) : null}

      {/* What the learner will be told, in the words they will be told it. An
          author should not have to publish and enrol to find that out. */}
      <p className="lms-drip__preview">
        {saved === 'date' && mod.releaseAt ? (
          <>
            Locked until <strong>{dripDateLabel(mod.releaseAt)}</strong>, then open to
            everyone.
          </>
        ) : saved === 'days' ? (
          <>
            Locked for the first <strong>{mod.releaseAfterDays}</strong>{' '}
            {mod.releaseAfterDays === 1 ? 'day' : 'days'} after someone enrols.
          </>
        ) : mode === 'now' ? (
          <>Open as soon as someone enrols.</>
        ) : (
          <>Not scheduled yet — pick {mode === 'date' ? 'a date' : 'a number of days'} above.</>
        )}
      </p>

      <p className="lms-drip__note">
        Free preview lessons stay open whatever this says, and the whole module is
        open to you and to reviewers.
      </p>
    </div>
  );
}
