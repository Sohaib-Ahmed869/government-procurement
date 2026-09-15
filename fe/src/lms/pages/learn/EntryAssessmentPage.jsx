import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import { entryAssessmentApi } from '../../../api/lms.js';
import { useCourseOutline } from '../../hooks/useCourseOutline.js';
import { lessonHref } from '../../utils/lessonHref.js';

// A brief or marking-criteria attachment. Not a plain link because the file
// itself is gated on enrolment (same S3-key-never-public-URL rule as
// everywhere else) — clicking asks the server for a short-lived signed URL
// and only then opens it, rather than shipping a working link to anyone
// looking at the page's markup.
function AttachmentLink({ courseId, attachment }) {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const { url } = await entryAssessmentApi.attachmentUrl(courseId, attachment._id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // The list item itself is the only feedback surface here; a failed
      // fetch just leaves the button clickable to try again.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="lms-doc-link lms-doc-link--btn" onClick={open} disabled={busy}>
      {busy ? 'Opening…' : attachment.name}
    </button>
  );
}

// The brief and marking criteria — shown at every stage (form, waiting on a
// mark, or already graded). These used to live only in the form branch, so
// they vanished the moment a submission existed; a learner checking back on
// what they were marked against, or resubmitting weeks later, couldn't see it.
function AssessmentReference({ assessment, courseId }) {
  return (
    <>
      {assessment.attachments?.length ? (
        <div className="lms-card" style={{ marginTop: 16 }}>
          <h2 className="lms-card__title">Brief</h2>
          <ul>
            {assessment.attachments.map((a) => (
              <li key={a._id}>
                <AttachmentLink courseId={courseId} attachment={a} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {assessment.markingCriteria?.text || assessment.markingCriteria?.attachments?.length ? (
        <div className="lms-card" style={{ marginTop: 16 }}>
          <h2 className="lms-card__title">
            <LmsIcon name="doc" />
            Marking criteria
          </h2>
          {assessment.markingCriteria.text ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{assessment.markingCriteria.text}</p>
          ) : null}
          {assessment.markingCriteria.attachments?.length ? (
            <ul style={{ marginTop: 10 }}>
              {assessment.markingCriteria.attachments.map((a) => (
                <li key={a._id}>
                  <AttachmentLink courseId={courseId} attachment={a} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// A grade card once the instructor has marked the lodgement. Shown in place
// of the form — resubmitting a graded assessment starts a fresh mark, so the
// learner is told plainly where they landed before being offered that.
function GradeCard({ submission, onResubmit, continueHref }) {
  const passed = submission.passed;
  const tint = passed
    ? { background: 'var(--lms-mint-soft)', border: '1px solid var(--lms-mint-soft)' }
    : { background: 'var(--lms-danger-soft)', border: '1px solid var(--lms-danger-soft)' };

  return (
    <div className="lms-card" style={{ textAlign: 'left' }}>
      <div className="lms-card__head">
        <h2 className="lms-card__title">
          <LmsIcon name="award" />
          Your result
        </h2>
      </div>

      {/* Score summary — its own tinted panel rather than plain text, so the
          headline number reads as a result and not another line in the list. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          borderRadius: 12,
          padding: '18px 20px',
          marginBottom: 16,
          ...tint,
        }}
      >
        <span style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: 'var(--lms-text)' }}>
          {submission.grade}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 600 }}>{submission.score}%</span>
          <span className={`lms-pill ${passed ? 'lms-pill--done' : 'lms-pill--due'}`}>
            {passed ? 'Pass' : 'Fail'}
          </span>
        </div>
      </div>

      {submission.autoTotal ? (
        <div
          className="lms-card"
          style={{
            background: 'var(--lms-surface-2)',
            border: '1px solid var(--lms-border)',
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: 'var(--lms-green)', display: 'flex', flexShrink: 0 }}>
            <LmsIcon name="check" />
          </span>
          <span style={{ fontSize: 13.5 }}>
            {submission.autoCorrect} of {submission.autoTotal} multiple-choice questions correct
          </span>
        </div>
      ) : null}

      {submission.instructorComment ? (
        <div
          className="lms-card"
          style={{
            background: 'var(--lms-surface-2)',
            border: '1px solid var(--lms-border)',
            borderLeft: '3px solid var(--lms-green)',
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 13, margin: '0 0 6px', color: 'var(--lms-muted)' }}>
            Instructor Feedback
          </h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{submission.instructorComment}</p>
        </div>
      ) : null}

      {passed ? (
        continueHref ? (
          <Link className="lms-btn lms-btn--primary" to={continueHref}>
            Next <LmsIcon name="arrow" />
          </Link>
        ) : null
      ) : (
        <button type="button" className="lms-btn lms-btn--primary" onClick={onResubmit}>
          Resubmit
        </button>
      )}
    </div>
  );
}

export default function EntryAssessmentPage() {
  const { slug } = useParams();
  const { data: outline } = useCourseOutline(slug);
  const courseId = outline?.course?.id;
  // Where "Next" takes a learner who has passed: the first lesson they
  // haven't done yet, same rule the course page uses to pick "Start course".
  const continueHref = outline ? lessonHref(slug, outline.enrolment?.next) : null;

  const [assessment, setAssessment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState({});
  const [files, setFiles] = useState({});
  const [ack, setAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;
    setStatus('loading');
    try {
      const res = await entryAssessmentApi.get(courseId);
      setAssessment(res.assessment);
      setSubmission(res.submission);
      setEditing(!res.submission);
      setStatus('ready');
    } catch (e) {
      setErr(e?.message ?? 'Could not load the entry assessment');
      setStatus('error');
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading' || !outline) {
    return <div className="lms-loading" role="status">Loading…</div>;
  }

  if (status === 'error') {
    return (
      <div className="lms-lesson-page">
        <h1 className="lms-page__title">Couldn’t load this assessment</h1>
        <p className="lms-page__subtitle">{err}</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="lms-lesson-page">
        <h1 className="lms-page__title">No entry assessment</h1>
        <p className="lms-page__subtitle">This course doesn’t have one set up.</p>
        <Link className="lms-btn lms-btn--primary" to={`/learn/courses/${slug}`}>
          Back to the course
        </Link>
      </div>
    );
  }

  if (submission && !editing) {
    if (submission.status === 'graded') {
      return (
        <div className="lms-lesson-page">
          <h1 className="lms-lesson-page__title">{assessment.title}</h1>
          <GradeCard
            submission={submission}
            onResubmit={() => setEditing(true)}
            continueHref={continueHref}
          />
          <AssessmentReference assessment={assessment} courseId={courseId} />
        </div>
      );
    }
    return (
      <div className="lms-lesson-page">
        <h1 className="lms-lesson-page__title">{assessment.title}</h1>
        <div className="lms-card">
          <p className="lms-empty">
            Submitted {new Date(submission.submittedAt).toLocaleDateString('en-AU')} — waiting
            on your instructor to mark it.
          </p>
        </div>
        <AssessmentReference assessment={assessment} courseId={courseId} />
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ack) {
      setErr('You must tick the independent-work acknowledgement to lodge this.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const payload = assessment.questions.map((q) =>
        q.type === 'mcq'
          ? { question: q._id, selectedOption: selected[q._id] }
          : { question: q._id, text: answers[q._id] ?? '' },
      );
      const fileList = assessment.questions
        .filter((q) => q.type === 'file' && files[q._id])
        .map((q) => files[q._id]);
      await entryAssessmentApi.submit(courseId, {
        answers: payload,
        files: fileList,
        integrityAck: ack,
      });
      await load();
    } catch (e2) {
      setErr(e2?.message ?? 'Could not submit your assessment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lms-lesson-page">
      <h1 className="lms-lesson-page__title">{assessment.title}</h1>

      {assessment.instructions ? (
        <article className="lms-card lms-lesson-page__body">
          <p style={{ whiteSpace: 'pre-wrap' }}>{assessment.instructions}</p>
        </article>
      ) : null}

      <AssessmentReference assessment={assessment} courseId={courseId} />

      <form className="lms-card" style={{ marginTop: 16 }} onSubmit={handleSubmit}>
        {assessment.questions.map((q, i) => (
          <div key={q._id} className="lms-field" style={{ marginBottom: 18 }}>
            <label className="lms-field__label">
              {i + 1}. {q.prompt}
            </label>
            {q.type === 'file' ? (
              <input
                type="file"
                onChange={(e) => setFiles((f) => ({ ...f, [q._id]: e.target.files[0] }))}
              />
            ) : q.type === 'mcq' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                {(q.options ?? []).map((o) => (
                  <label key={o._id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name={`q-${q._id}`}
                      value={o._id}
                      checked={selected[q._id] === o._id}
                      onChange={() => setSelected((s) => ({ ...s, [q._id]: o._id }))}
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="lms-textarea"
                rows={4}
                value={answers[q._id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q._id]: e.target.value }))}
              />
            )}
          </div>
        ))}

        <label className="lms-terms">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>
            I confirm this submission is my own independent work and accept the course’s
            academic integrity policy.
          </span>
        </label>

        {err ? <p className="lms-field__error">{err}</p> : null}

        <button type="submit" className="lms-btn lms-btn--primary" disabled={saving} style={{ marginTop: 14 }}>
          {saving ? 'Submitting…' : 'Submit assessment'}
        </button>
      </form>
    </div>
  );
}
