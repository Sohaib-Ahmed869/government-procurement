import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import CertificateBuilder from '../../components/instructor/CertificateBuilder.jsx';
import PathStepsEditor from '../../components/instructor/PathStepsEditor.jsx';
import RichTextEditor from '../../../admin/components/RichTextEditor.jsx';
import { authoringApi, catalogApi } from '../../../api/lms.js';
import { useApi, useAutosave } from '../../hooks/useApi.js';
import { useAuthoredProgram, displayStatus, STATUS_LABEL } from '../../hooks/usePrograms.js';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';

const TABS = [
  { value: 'courses', label: 'Courses', icon: 'modules' },
  { value: 'details', label: 'Details', icon: 'path' },
  { value: 'certificate', label: 'Certificate', icon: 'award' },
  { value: 'publish', label: 'Publish', icon: 'check' },
];

// A path's certificate defaults, mirroring PROGRAM_CERTIFICATE_DEFAULTS on the
// server so the builder's preview matches what will actually be issued.
const PATH_CERTIFICATE_DEFAULTS = {
  enabled: true,
  heading: 'Certificate of Achievement',
  preamble: 'This is to certify that',
  statement: 'has successfully completed the program',
  footnote: '',
  issuerName: 'Government Procurement',
  signatoryName: '',
  signatoryRole: '',
  accent: '#0a3114',
  background: '#ffffff',
  textColor: '#1a1a1a',
  showHours: true,
  showCredentialId: true,
};

// The learning path builder (LMS 8.0). Same shape as the course builder on
// purpose: an instructor who has built a course already knows this screen.
export default function PathBuilderPage() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { user } = useStudentAuth();
  const { program, status, error, reload, applyLocal } = useAuthoredProgram(programId);

  const [tab, setTab] = useState('courses');
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Everything this author may put in a path: their own courses, plus whatever
  // is already published. The server enforces the same rule; this is so the
  // picker never offers something the save would refuse.
  const { data: mine } = useApi(() => authoringApi.myCourses(), []);
  const { data: published } = useApi(() => catalogApi.list({ status: 'published' }), []);

  const catalogue = useMemo(() => {
    const rows = [...(mine ?? []), ...(published ?? [])];
    const seen = new Map();
    rows.forEach((c) => {
      if (c?._id && !seen.has(String(c._id))) seen.set(String(c._id), c);
    });
    return [...seen.values()].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
  }, [mine, published]);

  const save = useAutosave(
    useCallback((patch) => authoringApi.updateProgram(programId, patch), [programId]),
  );

  // Local overlay so typing stays instant while the PATCH is debounced behind
  // it, the same trick the course builder uses.
  const view = useMemo(() => ({ ...(program ?? {}), ...draft }), [program, draft]);

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    applyLocal(patch);
    save.queue(patch);
  };

  useEffect(() => {
    setDraft({});
  }, [programId]);

  const act = async (fn) => {
    setBusy(true);
    setActionError('');
    try {
      await save.flush();
      await fn();
      await reload();
    } catch (err) {
      setActionError(err?.message ?? 'That did not work');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') {
    return <div className="lms-card"><p className="lms-empty">Loading the path…</p></div>;
  }
  if (status === 'error' || !program) {
    return (
      <div className="lms-card">
        <p className="lms-empty">
          {error ?? 'That learning path could not be loaded.'}{' '}
          <Link to="/learn/instructor/paths">Back to your paths</Link>
        </p>
      </div>
    );
  }

  const state = displayStatus(view);
  const steps = view.steps ?? [];
  const stepCourses = steps
    .map((s) => catalogue.find((c) => String(c._id) === String(s.course)))
    .filter(Boolean);
  const unpublished = stepCourses.filter((c) => c.status !== 'published');
  const totalMinutes = stepCourses.reduce((sum, c) => sum + (c.minutes ?? 0), 0);
  const canSubmit = steps.length > 0 && unpublished.length === 0 && state !== 'pending';

  return (
    <div className="lms-builder">
      <div className="lms-builder__top">
        <Link className="lms-builder__back" to="/learn/instructor/paths">
          <LmsIcon name="chevron" />
          <span>My paths</span>
        </Link>
        <div className="lms-builder__save">
          <span className={`lms-pill lms-pill--${state}`}>{STATUS_LABEL[state]}</span>
          <span className={`lms-builder__saved${save.status === 'error' ? ' is-error' : ''}`}>
            {save.status === 'saving' ? 'Saving…' : save.status === 'error' ? save.error || 'Not saved' : 'Saved'}
          </span>
        </div>
      </div>

      <h1 className="lms-page__title">{view.title}</h1>
      <p className="lms-page__subtitle">
        {steps.length} {steps.length === 1 ? 'course' : 'courses'} · a learner who has already
        finished one keeps that credit.
      </p>

      <div className="lms-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={`lms-tab${tab === t.value ? ' is-active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            <LmsIcon name={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {actionError ? <p className="lms-alert lms-alert--error">{actionError}</p> : null}

      {tab === 'courses' ? (
        <section className="lms-card" style={{ marginTop: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="modules" />
              Courses in this path
            </h2>
          </div>
          <PathStepsEditor
            steps={steps}
            catalogue={catalogue}
            onChange={(next) => set({ steps: next })}
          />
        </section>
      ) : null}

      {tab === 'details' ? (
        <>
          <section className="lms-card" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="path" />
                About this path
              </h2>
            </div>
            <label className="lms-field">
              <span className="lms-field__label">Title</span>
              <input
                className="lms-input"
                value={view.title ?? ''}
                onChange={(e) => set({ title: e.target.value })}
              />
            </label>
            <label className="lms-field">
              <span className="lms-field__label">Summary</span>
              <textarea
                className="lms-textarea"
                rows={3}
                value={view.summary ?? ''}
                placeholder="One or two sentences on who this path is for."
                onChange={(e) => set({ summary: e.target.value })}
              />
            </label>
          </section>

          <section className="lms-card" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="text" />
                Full description
              </h2>
            </div>
            <RichTextEditor
              value={view.body ?? ''}
              onChange={(html) => set({ body: html })}
              allowImages={false}
              placeholder="What this program covers and what a learner comes away able to do."
            />
          </section>
        </>
      ) : null}

      {tab === 'certificate' ? (
        <section className="lms-card" style={{ marginTop: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="award" />
              Path certificate
            </h2>
            <span className="lms-card__note">
              Separate from the certificates of the courses inside it
            </span>
          </div>
          <CertificateBuilder
            subject={view}
            noun="path"
            defaults={PATH_CERTIFICATE_DEFAULTS}
            // Hours across every course in the path, so the document says what
            // the whole program was worth rather than what one course was.
            minutes={totalMinutes}
            previewName={user?.name}
            onChange={(patch) => set(patch)}
          />
        </section>
      ) : null}

      {tab === 'publish' ? (
        <section className="lms-card" style={{ marginTop: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="check" />
              Submit for review
            </h2>
          </div>

          {view.reviewNote && (state === 'rejected' || state === 'declined') ? (
            <p className="lms-alert lms-alert--error">
              <strong>{state === 'declined' ? 'Not accepted' : 'Changes requested'}:</strong>{' '}
              {view.reviewNote}
            </p>
          ) : null}

          <ul className="lms-checklist">
            <li className={steps.length ? 'is-ok' : 'is-todo'}>
              <LmsIcon name={steps.length ? 'check' : 'clock'} />
              At least one course in the path
            </li>
            <li className={unpublished.length === 0 ? 'is-ok' : 'is-todo'}>
              <LmsIcon name={unpublished.length === 0 ? 'check' : 'clock'} />
              {unpublished.length === 0
                ? 'Every course in the path is published'
                : `Not published yet: ${unpublished.map((c) => c.title).join(', ')}`}
            </li>
          </ul>

          <p className="lms-detail__note">
            An admin reviews the path and publishes it. Until then it is visible only to
            you. Approving a path does not change the courses inside it.
          </p>

          <div className="lms-composer__actions" style={{ marginTop: 14 }}>
            <span className="lms-composer__hint">
              {state === 'pending'
                ? 'Waiting on an admin. You can withdraw it while it waits.'
                : 'Nothing is visible to learners until it is approved.'}
            </span>
            <div className="lms-reviewform__buttons">
              <button
                type="button"
                className="lms-btn lms-btn--sm"
                disabled={busy}
                onClick={() => setConfirming(true)}
              >
                Delete path
              </button>
              {state === 'pending' ? (
                <button
                  type="button"
                  className="lms-btn lms-btn--sm"
                  disabled={busy}
                  onClick={() => act(() => authoringApi.withdrawProgram(programId))}
                >
                  Withdraw
                </button>
              ) : (
                <button
                  type="button"
                  className="lms-btn lms-btn--sm lms-btn--primary"
                  disabled={busy || !canSubmit}
                  onClick={() => act(() => authoringApi.submitProgram(programId))}
                >
                  <LmsIcon name="check" />
                  Submit for review
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          open
          title="Delete this learning path?"
          message="The courses inside it are not affected. Only the path itself is removed."
          confirmLabel="Delete path"
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            setConfirming(false);
            await act(async () => {
              await authoringApi.removeProgram(programId);
              navigate('/learn/instructor/paths');
            });
          }}
        />
      ) : null}
    </div>
  );
}
