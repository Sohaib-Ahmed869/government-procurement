import { useCallback, useEffect, useMemo, useState } from 'react';
import { reviewApi } from '../../api/lms.js';

/* ---------------------------------------------------------------------------
   Learning paths in the CMS review queue (LMS 8.0).

   The same queue and the same three outcomes as a course — approve, send back,
   reject — because a path reaches the public site the same way and an admin
   should not have to learn a second workflow for it.

   What is different is what there is to judge. A path has no lessons of its
   own; approving one is approving a SEQUENCE of courses that were each already
   reviewed. So the row shows the order and the prerequisites rather than a
   curriculum, which is the only thing here an admin has not already seen.
   ------------------------------------------------------------------------ */

const TABS = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'published', label: 'Published' },
  { value: 'all', label: 'All' },
];

function when(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusPill(p) {
  if (p.reviewStatus === 'pending') return ['admin-badge--warn', 'Awaiting review'];
  if (p.reviewStatus === 'rejected') return ['admin-badge--danger', 'Changes requested'];
  if (p.reviewStatus === 'declined') return ['admin-badge--danger', 'Not accepted'];
  if (p.status === 'published') return ['admin-badge--ok', 'Published'];
  return ['', 'Draft'];
}

// Both ways of refusing. Same dialog, different words, matching how the course
// queue words the identical pair.
const REFUSALS = {
  changes: {
    title: 'Request changes',
    lead: 'Sent back to be fixed. The instructor edits and resubmits.',
    placeholder: 'What needs to change before this path can go live?',
    confirm: 'Send back',
    call: (id, note) => reviewApi.rejectProgram(id, note),
  },
  decline: {
    title: 'Reject this path',
    lead: 'Refused outright rather than sent back with corrections. The instructor can rework it and submit again.',
    placeholder: 'Why isn’t this path going on the site?',
    confirm: 'Reject path',
    call: (id, note) => reviewApi.declineProgram(id, note),
  },
};

export default function AdminPathsPanel({ isAdmin, query }) {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setRows(await reviewApi.programs());
      setState('ready');
    } catch (err) {
      setError(err?.message ?? 'Could not load learning paths');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = (query ?? '').trim().toLowerCase();
    return rows.filter((p) => {
      if (tab === 'pending' && p.reviewStatus !== 'pending') return false;
      if (tab === 'published' && p.status !== 'published') return false;
      if (!needle) return true;
      return (
        p.title?.toLowerCase().includes(needle) ||
        p.author?.name?.toLowerCase().includes(needle)
      );
    });
  }, [rows, tab, query]);

  const counts = {
    pending: rows.filter((p) => p.reviewStatus === 'pending').length,
    published: rows.filter((p) => p.status === 'published').length,
    all: rows.length,
  };

  const act = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err?.message ?? 'That didn’t work');
    } finally {
      setBusyId(null);
    }
  };

  const refusal = REFUSALS[rejecting?.mode ?? 'changes'];

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-seg">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`admin-seg__btn${tab === t.value ? ' is-active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              <span className="admin-seg__count">{counts[t.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}

      {state === 'loading' ? (
        <div className="admin-card">Loading learning paths…</div>
      ) : visible.length === 0 ? (
        <div className="admin-card">
          {tab === 'pending' ? 'No learning paths waiting for review.' : 'No learning paths match that.'}
        </div>
      ) : (
        <div className="admin-courses">
          {visible.map((p) => {
            const [cls, label] = statusPill(p);
            const busy = busyId === p._id;
            const open = expanded === p._id;
            return (
              <article className="admin-card admin-course" key={p._id}>
                <div className="admin-course__head">
                  <div>
                    <h3 className="admin-course__title">{p.title}</h3>
                    <p className="admin-course__meta">
                      {p.author?.name ?? 'Unknown author'}
                      {p.author?.email ? ` · ${p.author.email}` : ''}
                      {p.submittedAt ? ` · submitted ${when(p.submittedAt)}` : ''}
                    </p>
                  </div>
                  <span className={`admin-badge ${cls}`}>{label}</span>
                </div>

                <p className="admin-course__meta">
                  {p.stepCount} {p.stepCount === 1 ? 'course' : 'courses'}
                  {p.courses?.length ? ` · ${p.courses.map((c) => c.title).join(' → ')}` : ''}
                </p>

                {p.summary ? <p className="admin-course__meta">{p.summary}</p> : null}

                {p.reviewNote && (p.reviewStatus === 'rejected' || p.reviewStatus === 'declined') ? (
                  <div className="admin-alert admin-alert--error">
                    <strong>{p.reviewStatus === 'declined' ? 'Rejected' : 'Sent back'}:</strong>{' '}
                    {p.reviewNote}
                  </div>
                ) : null}

                {open ? (
                  <PathSteps programId={p._id} />
                ) : null}

                <div className="admin-course__actions">
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => setExpanded(open ? null : p._id)}
                  >
                    {open ? 'Hide the sequence' : 'Review the sequence'}
                  </button>

                  {/* Approve sits last, at the right-hand end of the row, the
                      same place the course queue puts it: the confirming action
                      is the one a reader's eye lands on last, and the two
                      refusals should not be what the cursor reaches first. */}
                  {p.reviewStatus === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={!isAdmin || busy}
                        onClick={() => {
                          setRejecting({ id: p._id, mode: 'changes', title: p.title });
                          setNote('');
                        }}
                      >
                        Request changes
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        disabled={!isAdmin || busy}
                        onClick={() => {
                          setRejecting({ id: p._id, mode: 'decline', title: p.title });
                          setNote('');
                        }}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        disabled={!isAdmin || busy}
                        onClick={() => act(p._id, () => reviewApi.approveProgram(p._id))}
                      >
                        {busy ? 'Working…' : 'Approve and publish'}
                      </button>
                    </>
                  ) : p.status === 'published' ? (
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={!isAdmin || busy}
                      onClick={() => act(p._id, () => reviewApi.unpublishProgram(p._id))}
                    >
                      Unpublish
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {rejecting ? (
        <div className="admin-modal__backdrop" role="presentation" onClick={() => setRejecting(null)}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label={refusal.title}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="admin-modal__title">{refusal.title}</h3>
            <p className="admin-curric__by">{rejecting.title}</p>
            <p className="admin-course__note" style={{ margin: '10px 0 14px' }}>{refusal.lead}</p>
            <textarea
              className="admin-textarea"
              rows={4}
              value={note}
              autoFocus
              placeholder={refusal.placeholder}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setRejecting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                disabled={!note.trim()}
                onClick={async () => {
                  const { id } = rejecting;
                  setRejecting(null);
                  await act(id, () => refusal.call(id, note.trim()));
                }}
              >
                {refusal.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// The steps, fetched only when an admin opens one. A path with eight courses
// is eight more lookups, and the list renders fine without them.
function PathSteps({ programId }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    reviewApi
      .programDetail(programId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [programId]);

  if (failed) return <p className="admin-course__meta">Couldn’t load the sequence.</p>;
  if (!data) return <p className="admin-course__meta">Loading the sequence…</p>;

  return (
    <ol className="admin-pathsteps">
      {data.steps.map((s, i) => (
        <li key={s._id ?? i}>
          <strong>{s.course?.title ?? 'Course unavailable'}</strong>
          <span className="admin-course__meta">
            {s.lessons} {s.lessons === 1 ? 'lesson' : 'lessons'}
            {s.minutes ? ` · ${s.minutes} min` : ''}
            {s.required === false ? ' · elective' : ''}
            {s.course && s.course.status !== 'published' ? ' · NOT PUBLISHED' : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}
