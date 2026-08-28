import { useState } from 'react';
import LmsIcon from '../../components/LmsIcon.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { liveApi } from '../../../api/lms.js';
import { useAuthoredCourses } from '../../hooks/useAuthoring.js';
import {
  useAuthoredSessions,
  useLiveStatus,
  formatSessionTime,
  relativeTo,
} from '../../hooks/useLiveSessions.js';

/* Scheduling live sessions, the instructor's view (LMS 17.0b).

   Creating a session creates the meeting on the provider at the same time. That
   call is allowed to fail without losing the session: the row saves either way
   and carries the reason, with a Retry beside it. An instructor who has told
   thirty learners about Thursday should not lose Thursday because Zoom returned
   a 500. */

// The zones this audience actually teaches in. A free-text IANA box invites a
// typo that puts a session an hour out, which is the one mistake here that
// costs people a class.
const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Darwin',
  'Australia/Hobart',
  'Asia/Dubai',
];

const EMPTY = {
  courseId: '',
  title: '',
  description: '',
  startsAt: '',
  durationMinutes: 60,
  timezone: 'Australia/Sydney',
};

// <input type="datetime-local"> hands back a wall-clock string with no zone.
// The server stores a UTC instant plus the IANA name, so resolve the reading in
// the zone the instructor chose rather than the browser's — appending a Z here
// would silently claim they meant UTC.
function localToIso(value, timezone) {
  if (!value) return '';
  const naive = new Date(`${value}:00`);
  const asUtc = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' }));
  const asZone = new Date(naive.toLocaleString('en-US', { timeZone: timezone }));
  return new Date(naive.getTime() + (asUtc.getTime() - asZone.getTime())).toISOString();
}

export default function InstructorLiveSessionsPage() {
  const { courses } = useAuthoredCourses();
  const { sessions, status, error, reload } = useAuthoredSessions();
  const { live } = useLiveStatus();
  const { toast } = useToast();

  // The session queued for cancellation. Held rather than acted on immediately,
  // because cancelling tells everyone enrolled that a class they planned around
  // is off — worth one deliberate confirmation.
  const [cancelling, setCancelling] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [rowBusy, setRowBusy] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.courseId) return setFormError('Pick the course this session belongs to.');
    if (!form.startsAt) return setFormError('Pick a date and time.');

    setBusy(true);
    try {
      await liveApi.create({
        ...form,
        durationMinutes: Number(form.durationMinutes),
        startsAt: localToIso(form.startsAt, form.timezone),
      });
      setForm(EMPTY);
      setOpen(false);
      reload();
      toast.success(
        live.ready
          ? 'Session scheduled. Everyone enrolled can see it now.'
          : 'Session scheduled, but it has no meeting link yet.',
      );
    } catch (err) {
      // Inline, not a toast: this one names the field they have to fix, and it
      // belongs beside the form rather than floating away from it.
      setFormError(err?.message ?? 'Could not schedule that session.');
    } finally {
      setBusy(false);
    }
  }

  async function act(id, fn, done) {
    setRowBusy(id);
    try {
      await fn();
      reload();
      if (done) toast.success(done);
    } catch (err) {
      toast.error(err?.message ?? 'That did not work.');
    } finally {
      setRowBusy('');
    }
  }

  async function startAsHost(id) {
    try {
      // Fetched on the click and opened immediately — the host URL starts the
      // meeting in the instructor's name and is never held in state or listed.
      const { url } = await liveApi.hostUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err?.message ?? 'Could not open the meeting.');
    }
  }

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Live sessions</h1>
          <p className="lms-page__subtitle">
            Schedule a class on one of your courses. Everyone enrolled sees it and gets a join
            button when the room opens.
          </p>
        </div>
        <button type="button" className="lms-btn lms-btn--primary" onClick={() => setOpen((o) => !o)}>
          <LmsIcon name={open ? 'chevron' : 'plus'} />
          {open ? 'Close' : 'Schedule a session'}
        </button>
      </div>

      {/* The provider's state, said plainly rather than discovered on submit. */}
      {!live.ready ? (
        <div className="lms-card lms-notice" style={{ marginBottom: 18 }}>
          <span className="lms-notice__icon"><LmsIcon name="lock" /></span>
          <div className="lms-notice__body">
            <p className="lms-notice__title">Meeting links are not being created</p>
            <p className="lms-notice__text">
              {live.message} You can still schedule sessions — learners will see them, and each one
              gets a Retry once this is fixed.
            </p>
          </div>
        </div>
      ) : null}

      {open ? (
        <form className="lms-card lms-profileform lms-live-form" onSubmit={submit}>
          <div className="lms-field">
            <label className="lms-field__label" htmlFor="ls-course">Course</label>
            <select
              id="ls-course"
              className="lms-input"
              value={form.courseId}
              onChange={set('courseId')}
              required
            >
              <option value="">Choose a course…</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="lms-field">
            <label className="lms-field__label" htmlFor="ls-title">Title</label>
            <input
              id="ls-title"
              className="lms-input"
              value={form.title}
              onChange={set('title')}
              placeholder="Live Q&A: writing the executive summary"
              required
            />
          </div>

          <div className="lms-field">
            <label className="lms-field__label" htmlFor="ls-desc">
              What it covers <span className="lms-field__optional">optional</span>
            </label>
            <textarea
              id="ls-desc"
              className="lms-input"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Bring a draft — we'll work through two of them live."
            />
          </div>

          <div className="lms-formgrid">
            <div className="lms-field">
              <label className="lms-field__label" htmlFor="ls-when">Starts</label>
              <input
                id="ls-when"
                className="lms-input"
                type="datetime-local"
                value={form.startsAt}
                onChange={set('startsAt')}
                required
              />
            </div>
            <div className="lms-field">
              <label className="lms-field__label" htmlFor="ls-tz">Timezone</label>
              <select id="ls-tz" className="lms-input" value={form.timezone} onChange={set('timezone')}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.split('/')[1].replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="lms-field">
              <label className="lms-field__label" htmlFor="ls-dur">Length (minutes)</label>
              <input
                id="ls-dur"
                className="lms-input"
                type="number"
                min={5}
                max={600}
                step={5}
                value={form.durationMinutes}
                onChange={set('durationMinutes')}
              />
            </div>
          </div>

          {formError ? <p className="lms-field__error">{formError}</p> : null}

          <div className="lms-live-form__actions">
            <button type="button" className="lms-btn lms-btn--ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="lms-btn lms-btn--primary" disabled={busy}>
              {busy ? 'Scheduling…' : 'Schedule session'}
            </button>
          </div>
        </form>
      ) : null}

      {status === 'loading' ? <p className="lms-empty">Loading…</p> : null}
      {status === 'error' ? <p className="lms-empty">{error}</p> : null}

      {status === 'ready' && !sessions.length ? (
        <div className="lms-card">
          <p className="lms-empty">No sessions scheduled yet.</p>
        </div>
      ) : null}

      {sessions.length ? (
        <div className="lms-card lms-dtable__scroll">
          <table className="lms-dtable">
            <thead>
              <tr>
                <th>Session</th>
                <th>Course</th>
                <th>When</th>
                <th>Meeting</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id} className={s.state === 'cancelled' ? 'is-revoked' : ''}>
                  <td>
                    <span className="lms-dtable__strong">{s.title}</span>
                    <span className={`lms-live-badge lms-live-badge--${s.state}`}>
                      {s.state === 'live' ? <span className="lms-live-dot" aria-hidden="true" /> : null}
                      {s.state}
                    </span>
                  </td>
                  <td>{s.course?.title ?? '—'}</td>
                  <td>
                    {formatSessionTime(s.startsAt, s.timezone)}
                    {s.state === 'upcoming' ? (
                      <span className="lms-dtable__muted"> · {relativeTo(s.startsAt)}</span>
                    ) : null}
                  </td>
                  <td>
                    {s.hasMeeting ? (
                      <span className="lms-dtable__ok">
                        <LmsIcon name="check" /> Ready
                        {s.passcode ? (
                          <span className="lms-dtable__muted">· {s.passcode}</span>
                        ) : null}
                      </span>
                    ) : s.state === 'cancelled' ? (
                      <span className="lms-dtable__muted">—</span>
                    ) : (
                      <span className="lms-dtable__warn" title={s.providerError}>No link yet</span>
                    )}
                  </td>
                  <td>
                    <div className="lms-dtable__actions">
                      {s.state !== 'cancelled' && s.hasMeeting ? (
                        <button
                          type="button"
                          className="lms-btn lms-btn--ghost lms-btn--sm"
                          onClick={() => startAsHost(s._id)}
                        >
                          Start as host
                        </button>
                      ) : null}
                      {s.state !== 'cancelled' && !s.hasMeeting ? (
                        <button
                          type="button"
                          className="lms-btn lms-btn--ghost lms-btn--sm"
                          disabled={rowBusy === s._id}
                          onClick={() =>
                            act(s._id, () => liveApi.retry(s._id), 'Meeting link created.')
                          }
                        >
                          Retry link
                        </button>
                      ) : null}
                      {s.state === 'upcoming' ? (
                        <button
                          type="button"
                          className="lms-btn lms-btn--ghost lms-btn--sm lms-btn--danger"
                          disabled={rowBusy === s._id}
                          onClick={() => setCancelling(s)}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this session?"
        message={`"${cancelling?.title ?? ''}" will be called off and its Zoom meeting deleted.`}
        detail="Everyone enrolled keeps seeing it, marked cancelled, with your reason. That is what tells someone who planned their day around it."
        confirmLabel="Cancel session"
        cancelLabel="Keep it"
        reasonLabel="Tell learners why"
        reasonPlaceholder="Clashes with a public holiday"
        onCancel={() => setCancelling(null)}
        onConfirm={(reason) => {
          const target = cancelling;
          setCancelling(null);
          act(target._id, () => liveApi.cancel(target._id, reason), 'Session cancelled.');
        }}
      />
    </div>
  );
}
