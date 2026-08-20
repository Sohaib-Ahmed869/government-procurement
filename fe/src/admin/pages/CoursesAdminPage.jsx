import { useCallback, useEffect, useMemo, useState } from 'react';
import { reviewApi } from '../../api/lms.js';
import AdminPathsPanel from '../components/AdminPathsPanel.jsx';
import CurriculumLesson from '../components/CurriculumLesson.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/* Courses (CMS).
 *
 * Courses are AUTHORED IN THE LMS by instructors. This screen is what the
 * business does with them: see everything from every instructor, approve what
 * is waiting, and choose what the homepage promotes.
 *
 * There is deliberately no create or edit here. Two editors for one Course
 * record would drift, and the LMS builder is the one that knows about modules,
 * lessons, video and transcripts — none of which this screen could show.
 */

const TABS = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'published', label: 'Published' },
  { value: 'all', label: 'All courses' },
];

function when(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// What's worth saying about a lesson at a glance. Gaps are listed as faults
// rather than as neutral metadata — "no file" on a video lesson is the thing a
// reviewer should refuse to approve, so it reads differently from "transcript".
function lessonFlags(lesson) {
  const flags = [];
  if (lesson.preview) flags.push({ label: 'Free preview' });

  if (lesson.kind === 'video') {
    if (!lesson.hasVideo) flags.push({ label: 'No file', missing: true });
    if (!lesson.hasTranscript) flags.push({ label: 'No transcript', missing: true });
  }
  if (lesson.kind === 'youtube') {
    if (!lesson.youtube?.videoId) flags.push({ label: 'No link', missing: true });
    // Not flagged as missing: a public YouTube video is a deliberate choice,
    // but a reviewer should see that this lesson isn't behind the paywall.
    else flags.push({ label: 'Public video' });
  }
  if (lesson.kind === 'doc') {
    if (!lesson.document) flags.push({ label: 'No document', missing: true });
    else if (lesson.document.url) flags.push({ label: 'Linked' });
  }
  if (lesson.kind === 'text' && !lesson.bodyLength) {
    flags.push({ label: 'No content', missing: true });
  }
  if (lesson.kind === 'quiz') {
    const n = lesson.questionCount ?? 0;
    flags.push(
      n === 0
        ? { label: 'No questions', missing: true }
        : { label: `${n} question${n === 1 ? '' : 's'}` },
    );
  }
  return flags;
}

// Rolled up so a reviewer doesn't have to count modules and lessons by hand,
// and so the number of gaps is visible before they approve rather than after.
function curriculumTotals(modules = []) {
  const lessons = modules.flatMap((m) => m.lessons ?? []);
  return {
    modules: modules.length,
    lessons: lessons.length,
    minutes: lessons.reduce((s, l) => s + (l.minutes || 0), 0),
    previews: lessons.filter((l) => l.preview).length,
    missing: lessons.filter((l) => lessonFlags(l).some((f) => f.missing)).length,
  };
}

export default function CoursesAdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';

  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [tab, setTab] = useState('pending');
  // Courses and learning paths share this screen because they share a queue: an
  // instructor submits both, and the same admin decides on both. Split into two
  // lists rather than one mixed one, because the thing being judged differs —
  // a course is a curriculum, a path is a sequence of courses already approved.
  const [kind, setKind] = useState('courses');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setRows(await reviewApi.courses());
      setState('ready');
    } catch (err) {
      setError(err?.message ?? 'Could not load courses');
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Escape closes whichever dialog is open, as it does elsewhere in the CMS.
  useEffect(() => {
    if (!detail && !rejecting) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setDetail(null);
      setRejecting(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, rejecting]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (tab === 'pending' && c.reviewStatus !== 'pending') return false;
      if (tab === 'published' && c.status !== 'published') return false;
      if (!needle) return true;
      return (
        c.title?.toLowerCase().includes(needle) ||
        c.author?.name?.toLowerCase().includes(needle)
      );
    });
  }, [rows, tab, q]);

  const counts = {
    pending: rows.filter((c) => c.reviewStatus === 'pending').length,
    published: rows.filter((c) => c.status === 'published').length,
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

  const openDetail = async (course) => {
    setDetail({ course, loading: true });
    try {
      const data = await reviewApi.detail(course._id);
      setDetail({ course, ...data, loading: false });
    } catch {
      setDetail({ course, loading: false, modules: [] });
    }
  };

  const totals = curriculumTotals(detail?.modules);

  const statusPill = (c) => {
    if (c.reviewStatus === 'pending') return ['admin-badge--warn', 'Awaiting review'];
    if (c.reviewStatus === 'rejected') return ['admin-badge--danger', 'Changes requested'];
    // Told apart from "changes requested" on purpose. They read the same to an
    // admin scanning the list otherwise, and they mean different things.
    if (c.reviewStatus === 'declined') return ['admin-badge--danger', 'Not accepted'];
    if (c.status === 'published') return ['admin-badge--ok', 'Published'];
    return ['', 'Draft'];
  };

  // The two ways of refusing a submission. Same dialog, because both are "give
  // a reason and confirm"; different words throughout, because an instructor
  // reading the outcome needs to know which one happened.
  const REFUSALS = {
    changes: {
      title: 'Request changes',
      lead: 'Sent back to be fixed. The instructor edits and resubmits.',
      placeholder: 'What needs to change before this can go live?',
      confirm: 'Send back',
      call: (id, note) => reviewApi.reject(id, note),
    },
    decline: {
      title: 'Reject this course',
      lead: 'Refused outright, rather than sent back with corrections. The instructor can rework it and submit again.',
      placeholder: 'Why isn’t this going on the site?',
      confirm: 'Reject course',
      call: (id, note) => reviewApi.decline(id, note),
    },
  };
  const refusal = REFUSALS[rejecting?.mode ?? 'changes'];

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Courses</h2>
          <p className="admin-page__subtitle">
            Written by instructors in the LMS. Approve what’s waiting, and choose what the
            homepage features.
          </p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-seg">
          <button
            type="button"
            className={`admin-seg__btn${kind === 'courses' ? ' is-active' : ''}`}
            onClick={() => setKind('courses')}
          >
            Courses
          </button>
          <button
            type="button"
            className={`admin-seg__btn${kind === 'paths' ? ' is-active' : ''}`}
            onClick={() => setKind('paths')}
          >
            Learning paths
          </button>
        </div>
        <input
          className="admin-input"
          placeholder={kind === 'paths' ? 'Search path or instructor…' : 'Search title or instructor…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280, marginLeft: 'auto' }}
        />
      </div>

      {kind === 'paths' ? <AdminPathsPanel isAdmin={isAdmin} query={q} /> : null}

      {kind === 'courses' ? (
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
      ) : null}

      {kind === 'courses' && error ? (
        <div className="admin-alert admin-alert--error">{error}</div>
      ) : null}

      {kind === 'courses' && !isAdmin ? (
        <div className="admin-alert">
          You can review submissions here. Approving, rejecting and featuring are
          super-admin actions.
        </div>
      ) : null}

      {kind !== 'courses' ? null : state === 'loading' ? (
        <div className="admin-card">Loading courses…</div>
      ) : visible.length === 0 ? (
        <div className="admin-card">
          {tab === 'pending'
            ? 'Nothing waiting for review.'
            : 'No courses match that.'}
        </div>
      ) : (
        <div className="admin-courses">
          {visible.map((c) => {
            const [cls, label] = statusPill(c);
            const busy = busyId === c._id;
            return (
              <article className="admin-card admin-course" key={c._id}>
                <div className="admin-course__head">
                  <div>
                    <h3 className="admin-course__title">{c.title}</h3>
                    <p className="admin-course__meta">
                      {c.author?.name ?? 'CMS-authored'}
                      {c.author?.email ? ` · ${c.author.email}` : ''}
                      {c.submittedAt ? ` · submitted ${when(c.submittedAt)}` : ''}
                    </p>
                  </div>
                  <span className={`admin-badge ${cls}`}>{label}</span>
                </div>

                <ul className="admin-course__stats">
                  <li><strong>{c.lessonCount ?? 0}</strong> lessons</li>
                  <li><strong>{c.minutes ?? 0}</strong> min</li>
                  <li><strong>{c.learners ?? 0}</strong> enrolled</li>
                  <li>{c.price ? `$${c.price}` : 'Free'}</li>
                  <li>{c.levelLabel || c.level}</li>
                </ul>

                {c.reviewNote && (c.reviewStatus === 'rejected' || c.reviewStatus === 'declined') ? (
                  <p className="admin-course__note">
                    {c.reviewStatus === 'declined' ? 'Rejected' : 'Sent back'}: {c.reviewNote}
                  </p>
                ) : null}

                <div className="admin-course__foot">
                  {/* Featuring is separate from approving: a published course
                      isn't automatically something the homepage should push. */}
                  <label className="admin-course__feature">
                    <input
                      type="checkbox"
                      checked={Boolean(c.featured)}
                      disabled={!isAdmin || busy || c.status !== 'published'}
                      onChange={(e) => act(c._id, () => reviewApi.setFeatured(c._id, e.target.checked))}
                    />
                    <span>
                      Featured on homepage
                      {c.status !== 'published' ? ' (publish first)' : ''}
                    </span>
                  </label>

                  <div className="admin-course__actions">
                    <button type="button" className="admin-btn admin-btn--sm" onClick={() => openDetail(c)}>
                      View curriculum
                    </button>

                    {c.reviewStatus === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className="admin-btn admin-btn--sm"
                          disabled={!isAdmin || busy}
                          onClick={() => { setRejecting({ course: c, mode: 'changes' }); setNote(''); }}
                        >
                          Request changes
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--sm admin-btn--danger"
                          disabled={!isAdmin || busy}
                          onClick={() => { setRejecting({ course: c, mode: 'decline' }); setNote(''); }}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--sm admin-btn--primary"
                          disabled={!isAdmin || busy}
                          onClick={() => act(c._id, () => reviewApi.approve(c._id))}
                        >
                          {busy ? 'Working…' : 'Approve & publish'}
                        </button>
                      </>
                    ) : c.status === 'published' ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--sm"
                        disabled={!isAdmin || busy}
                        onClick={() => act(c._id, () => reviewApi.unpublish(c._id))}
                      >
                        Take offline
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Either refusal needs a reason — one without it is a dead end for the
          instructor, so the button stays disabled until there is one. */}
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
            <p className="admin-curric__by">{rejecting.course.title}</p>
            <p className="admin-course__note" style={{ margin: '10px 0 14px' }}>{refusal.lead}</p>
            <textarea
              className="admin-textarea"
              rows={4}
              value={note}
              placeholder={refusal.placeholder}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="admin-modal__actions" style={{ marginTop: 16 }}>
              <button type="button" className="admin-btn" onClick={() => setRejecting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                disabled={!note.trim()}
                onClick={async () => {
                  const { course: c } = rejecting;
                  const send = refusal.call;
                  const reason = note.trim();
                  setRejecting(null);
                  await act(c._id, () => send(c._id, reason));
                }}
              >
                {refusal.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* The curriculum an admin is actually approving. The CMS record alone
          doesn't show it, so without this they'd be signing off on a title. */}
      {detail ? (
        <div className="admin-modal__backdrop" role="presentation" onClick={() => setDetail(null)}>
          <div
            className="admin-modal admin-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label={`Curriculum for ${detail.course.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-curric__head">
              <div>
                <h3 className="admin-modal__title" style={{ marginBottom: 0 }}>
                  {detail.course.title}
                </h3>
                <p className="admin-curric__by">
                  {detail.course.author?.name ?? 'CMS-authored'}
                </p>
              </div>
              <span className={`admin-badge ${statusPill(detail.course)[0]}`}>
                {statusPill(detail.course)[1]}
              </span>
            </div>

            {detail.loading ? (
              <p className="admin-curric__empty">Loading curriculum…</p>
            ) : !detail.modules?.length ? (
              <p className="admin-curric__empty">
                This course has no modules yet, so there’s nothing to review.
              </p>
            ) : (
              <>
                {/* The totals a reviewer would otherwise have to count by hand,
                    including the gaps that should block an approval. */}
                <div className="admin-curric__totals">
                  <span className="admin-curric__total">
                    <strong>{totals.modules}</strong> modules
                  </span>
                  <span className="admin-curric__total">
                    <strong>{totals.lessons}</strong> lessons
                  </span>
                  {totals.minutes ? (
                    <span className="admin-curric__total">
                      <strong>{totals.minutes}</strong> min
                    </span>
                  ) : null}
                  {totals.previews ? (
                    <span className="admin-curric__total">
                      <strong>{totals.previews}</strong> free preview
                      {totals.previews === 1 ? '' : 's'}
                    </span>
                  ) : null}
                  {totals.missing ? (
                    <span className="admin-curric__total admin-curric__total--warn">
                      <strong>{totals.missing}</strong> need
                      {totals.missing === 1 ? 's' : ''} attention
                    </span>
                  ) : null}
                </div>

                <div className="admin-curric">
                  {detail.modules.map((m, mi) => (
                    <section className="admin-curric__mod" key={m._id}>
                      <header className="admin-curric__mod-head">
                        <span className="admin-curric__mod-no">{mi + 1}</span>
                        <h4 className="admin-curric__mod-title">{m.title}</h4>
                        <span className="admin-curric__mod-count">
                          {m.lessons.length} lesson{m.lessons.length === 1 ? '' : 's'}
                        </span>
                      </header>

                      {m.lessons.length === 0 ? (
                        <p className="admin-curric__lesson" style={{ color: 'var(--admin-muted)' }}>
                          No lessons in this module.
                        </p>
                      ) : (
                        <ul className="admin-curric__lessons">
                          {m.lessons.map((l) => (
                            <CurriculumLesson key={l._id} lesson={l} flags={lessonFlags(l)} />
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              </>
            )}

            <div className="admin-modal__actions" style={{ marginTop: 20 }}>
              <button type="button" className="admin-btn" onClick={() => setDetail(null)}>
                Close
              </button>
              {/* All three decisions available from the screen where the
                  curriculum is actually read, rather than making a reviewer
                  close this and find the row again to refuse it. */}
              {detail.course.reviewStatus === 'pending' && isAdmin ? (
                <>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => {
                      setRejecting({ course: detail.course, mode: 'changes' });
                      setNote('');
                      setDetail(null);
                    }}
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger"
                    onClick={() => {
                      setRejecting({ course: detail.course, mode: 'decline' });
                      setNote('');
                      setDetail(null);
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={async () => {
                      const c = detail.course;
                      setDetail(null);
                      await act(c._id, () => reviewApi.approve(c._id));
                    }}
                  >
                    Approve &amp; publish
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
