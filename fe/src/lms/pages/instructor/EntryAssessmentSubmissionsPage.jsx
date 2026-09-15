import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { authoringApi } from '../../../api/lms.js';

// One lodgement's marking form: score, comment, and the letter grade the
// server derives from the score. Expanded inline under its row rather than a
// separate screen — an instructor grading a class works down the list.
function GradingForm({ courseId, submission, assessment, onGraded }) {
  const questionById = new Map((assessment?.questions ?? []).map((q) => [String(q._id), q]));
  const [score, setScore] = useState(submission.score ?? '');
  const [comment, setComment] = useState(submission.instructorComment ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    Promise.all(
      (submission.files ?? []).map(async (f) => {
        try {
          const { url } = await authoringApi.entryAssessmentSubmissionFileUrl(
            courseId,
            submission._id,
            f._id,
          );
          return { ...f, url };
        } catch {
          return { ...f, url: '' };
        }
      }),
    ).then(setFiles);
  }, [courseId, submission._id, submission.files]);

  async function grade() {
    setBusy(true);
    setErr('');
    try {
      const n = Number(score);
      if (Number.isNaN(n) || n < 0 || n > 100) throw new Error('Enter a score from 0-100');
      const graded = await authoringApi.gradeEntryAssessmentSubmission(courseId, submission._id, {
        score: n,
        comment,
      });
      onGraded(graded);
    } catch (e) {
      setErr(e?.message ?? 'Could not save the grade');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lms-card" style={{ marginTop: 8, background: 'var(--lms-surface-2)' }}>
      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Answers</h3>
      {submission.autoTotal ? (
        <p className="lms-pill lms-pill--done" style={{ marginBottom: 10 }}>
          {submission.autoCorrect} of {submission.autoTotal} multiple-choice correct
        </p>
      ) : null}
      {(submission.answers ?? []).length === 0 && files.length === 0 ? (
        <p className="lms-empty">No answers.</p>
      ) : (
        (submission.answers ?? []).map((a) => {
          const q = questionById.get(String(a.question));
          if (q?.type === 'mcq') {
            const chosen = q.options?.find((o) => String(o._id) === String(a.selectedOption));
            return (
              <p key={a.question}>
                <strong>{q.prompt}</strong>
                <br />
                <span className={a.correct ? 'lms-pill lms-pill--done' : 'lms-pill lms-pill--due'}>
                  {chosen?.text ?? 'No answer'} — {a.correct ? 'Correct' : 'Incorrect'}
                </span>
              </p>
            );
          }
          if (!a.text && !q?.referenceAnswer) return null;
          return (
            <div key={a.question} style={{ marginBottom: 10 }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {q?.prompt ? <strong>{q.prompt}</strong> : null}
                {a.text ? (
                  <>
                    <br />
                    {a.text}
                  </>
                ) : null}
              </p>
              {q?.referenceAnswer ? (
                <p
                  style={{
                    whiteSpace: 'pre-wrap',
                    marginTop: 4,
                    fontSize: 12.5,
                    color: 'var(--lms-muted)',
                  }}
                >
                  Reference answer: {q.referenceAnswer}
                </p>
              ) : null}
            </div>
          );
        })
      )}
      {files.length ? (
        <ul>
          {files.map((f) => (
            <li key={f._id}>
              {f.url ? (
                <a className="lms-doc-link" href={f.url} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
              ) : (
                f.name
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <p style={{ fontSize: 12.5, color: 'var(--lms-muted)' }}>
        Acknowledged independent work at{' '}
        {new Date(submission.integrityAcknowledgedAt).toLocaleString('en-AU')}
      </p>

      {submission.status === 'graded' ? (
        // Already marked: shown read-only rather than as an editable form.
        // Re-grading isn't offered here — the grade a learner sees is the
        // one on record, not something that quietly changes underneath them.
        <div
          className="lms-card"
          style={{ background: 'var(--lms-surface-3)', border: '1px solid var(--lms-border)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: submission.instructorComment ? 8 : 0 }}>
            <span className={`lms-pill ${submission.passed ? 'lms-pill--done' : 'lms-pill--due'}`}>
              {submission.grade} · {submission.score}% · {submission.passed ? 'Pass' : 'Fail'}
            </span>
          </div>
          {submission.instructorComment ? (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13.5 }}>
              {submission.instructorComment}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="lms-formgrid" style={{ marginTop: 12 }}>
            <div className="lms-field">
              <span className="lms-field__label">Score (%)</span>
              <input
                className="lms-input"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
          </div>
          <div className="lms-field" style={{ marginTop: 10 }}>
            <span className="lms-field__label">Comment to the student</span>
            <textarea
              className="lms-textarea"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {err ? <p className="lms-field__error">{err}</p> : null}
          <button
            type="button"
            className="lms-btn lms-btn--primary"
            disabled={busy}
            style={{ marginTop: 10 }}
            onClick={grade}
          >
            {busy ? 'Saving…' : 'Save grade'}
          </button>
        </>
      )}
    </div>
  );
}

export default function EntryAssessmentSubmissionsPage() {
  const { courseId } = useParams();
  const [items, setItems] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [status, setStatus] = useState('loading');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [rows, def] = await Promise.all([
        authoringApi.entryAssessmentSubmissions(courseId),
        authoringApi.getEntryAssessment(courseId),
      ]);
      setItems(rows);
      setAssessment(def);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  function applyGraded(graded) {
    setItems((rows) => rows.map((r) => (r._id === graded._id ? { ...r, ...graded } : r)));
  }

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Entry assessment submissions</h1>
          <p className="lms-page__subtitle">Lodgements waiting on, or already given, a mark.</p>
        </div>
        <Link className="lms-btn lms-btn--ghost" to={`/learn/instructor/courses/${courseId}`}>
          Back to course
        </Link>
      </div>

      {status === 'loading' ? <p className="lms-empty">Loading…</p> : null}
      {status === 'error' ? <p className="lms-empty">Could not load submissions.</p> : null}

      {status === 'ready' && items.length === 0 ? (
        <p className="lms-empty">No submissions yet.</p>
      ) : null}

      {items.map((s) => (
        <div key={s._id} className="lms-card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{s.user?.name ?? s.user?.email ?? 'Learner'}</strong>
              <div style={{ fontSize: 12.5, color: 'var(--lms-muted)' }}>
                Submitted {new Date(s.submittedAt).toLocaleString('en-AU')}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {s.status === 'graded' ? (
                <span className={`lms-pill ${s.passed ? 'lms-pill--done' : 'lms-pill--due'}`}>
                  {s.grade} · {s.score}%
                </span>
              ) : (
                <span className="lms-pill lms-pill--due">Ungraded</span>
              )}
              <button
                type="button"
                className="lms-btn lms-btn--ghost"
                onClick={() => setOpenId(openId === s._id ? null : s._id)}
              >
                <LmsIcon name="chevron" /> {openId === s._id ? 'Hide' : 'Review'}
              </button>
            </div>
          </div>
          {openId === s._id ? (
            <GradingForm
              courseId={courseId}
              submission={s}
              assessment={assessment}
              onGraded={applyGraded}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
