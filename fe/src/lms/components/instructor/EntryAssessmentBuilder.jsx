import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { authoringApi } from '../../../api/lms.js';

let qid = 0;
let oid = 0;
const newQuestion = () => ({ _key: `new-${qid++}`, prompt: '', type: 'written', options: [] });
const newOption = () => ({ _key: `opt-${oid++}`, text: '', correct: false });

// A save round-trips the whole assessment through the server, which assigns a
// real `_id` to anything new. Keying elements on that meant a freshly added
// question or option changed key — from its local `_key` to the server's
// `_id` — the moment the save it triggered came back, which unmounted and
// remounted that row mid-interaction and threw the page's scroll position
// around. Keeping the local `_key` stable across a save (matched back onto
// the saved data by position) keeps every row mounted once and for good.
function withStableKeys(questions, prev = []) {
  return (questions ?? []).map((q, i) => ({
    ...q,
    _key: prev[i]?._key ?? newQuestion()._key,
    options: (q.options ?? []).map((o, oi) => ({
      ...o,
      _key: prev[i]?.options?.[oi]?._key ?? newOption()._key,
    })),
  }));
}

// The entry assessment tab (LMS entry-assessment): the brief, its questions,
// marking criteria and whether it gates the course. One document per course,
// loaded and saved as a whole — there's no reason to debounce a form this
// small the way the course's own fields are.
export default function EntryAssessmentBuilder({ courseId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    title: 'Entry assessment',
    instructions: '',
    required: false,
    passScore: 50,
    questions: [],
    attachments: [],
    markingCriteria: { text: '', attachments: [] },
  });

  // Strict Mode runs a mount effect twice in dev, so this fires as two
  // overlapping requests. Without a guard, whichever answer lands SECOND wins
  // — including landing after the first has already rendered the form and the
  // instructor has clicked "Add question". That looked like the click "didn't
  // work": the question appeared for a moment and then the stale duplicate
  // response quietly put the untouched server copy back over it.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const existing = await authoringApi.getEntryAssessment(courseId);
      if (seq !== loadSeq.current) return; // superseded by a newer load
      if (existing) setForm({ ...existing, questions: withStableKeys(existing.questions) });
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setErr(e?.message ?? 'Could not load the entry assessment');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch = {}) {
    setSaving(true);
    setErr('');
    const next = { ...form, ...patch };
    setForm(next);
    try {
      const saved = await authoringApi.saveEntryAssessment(courseId, {
        title: next.title,
        instructions: next.instructions,
        required: next.required,
        passScore: next.passScore,
        markingCriteriaText: next.markingCriteria?.text ?? '',
        questions: next.questions.map(({ _key, options, ...q }) => ({
          ...q,
          options: (options ?? []).map(({ _key: _optKey, ...o }) => o),
        })),
      });
      setForm((prev) => ({ ...saved, questions: withStableKeys(saved.questions, prev.questions) }));
    } catch (e) {
      setErr(e?.message ?? 'Could not save the entry assessment');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAttachment(file, target) {
    setErr('');
    try {
      const saved = await authoringApi.addEntryAssessmentAttachment(courseId, file, target);
      setForm((prev) => ({ ...saved, questions: withStableKeys(saved.questions, prev.questions) }));
    } catch (e) {
      setErr(e?.message ?? 'Could not upload that file');
    }
  }

  async function removeAttachment(attachmentId) {
    try {
      const saved = await authoringApi.removeEntryAssessmentAttachment(courseId, attachmentId);
      setForm((prev) => ({ ...saved, questions: withStableKeys(saved.questions, prev.questions) }));
    } catch (e) {
      setErr(e?.message ?? 'Could not remove that file');
    }
  }

  if (loading) return <p className="lms-empty">Loading…</p>;

  return (
    <div className="lms-builder">
      <div className="lms-card">
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="quiz" />
            Entry assessment
          </h2>
          <Link
            className="lms-btn lms-btn--ghost"
            to={`/learn/instructor/courses/${courseId}/entry-assessment/submissions`}
          >
            View submissions
          </Link>
        </div>

        <p className="lms-page__subtitle">
          Shown to a learner before the rest of this course, if you mark it required below.
        </p>

        <label className="lms-terms" style={{ marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={Boolean(form.required)}
            onChange={(e) => save({ required: e.target.checked })}
          />
          <span>Require this assessment before the course content unlocks</span>
        </label>

        <div className="lms-formgrid">
          <div className="lms-field">
            <span className="lms-field__label">Title</span>
            <input
              className="lms-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onBlur={() => save()}
            />
          </div>
          <div className="lms-field">
            <span className="lms-field__label">Pass score (%)</span>
            <input
              className="lms-input"
              type="number"
              min={0}
              max={100}
              value={form.passScore}
              onChange={(e) => setForm((f) => ({ ...f, passScore: e.target.value }))}
              onBlur={() => save()}
            />
          </div>
        </div>

        <div className="lms-field" style={{ marginTop: 14 }}>
          <span className="lms-field__label">Instructions / brief</span>
          <textarea
            className="lms-textarea"
            rows={5}
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            onBlur={() => save()}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <span className="lms-field__label">Brief attachments (e.g. a PPT)</span>
          <ul>
            {(form.attachments ?? []).map((a) => (
              <li key={a._id}>
                {a.name}{' '}
                <button
                  type="button"
                  className="lms-btn lms-btn--ghost lms-btn--sm"
                  onClick={() => removeAttachment(a._id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <input
            type="file"
            onChange={(e) => e.target.files[0] && uploadAttachment(e.target.files[0], 'brief')}
          />
        </div>
      </div>

      <div className="lms-card" style={{ marginTop: 16 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">Questions</h2>
          <button
            type="button"
            className="lms-btn lms-btn--ghost"
            onClick={() =>
              setForm((f) => ({ ...f, questions: [...f.questions, newQuestion()] }))
            }
          >
            <LmsIcon name="plus" /> Add question
          </button>
        </div>

        {form.questions.length === 0 ? (
          <p className="lms-empty">No questions yet.</p>
        ) : (
          form.questions.map((q, i) => (
            <div key={q._key} className="lms-card" style={{ marginBottom: 12, background: 'var(--lms-surface-2)' }}>
              <div className="lms-formgrid">
                <div className="lms-field" style={{ gridColumn: 'span 2' }}>
                  <span className="lms-field__label">Question {i + 1}</span>
                  <input
                    className="lms-input"
                    value={q.prompt}
                    onChange={(e) => {
                      const questions = [...form.questions];
                      questions[i] = { ...q, prompt: e.target.value };
                      setForm((f) => ({ ...f, questions }));
                    }}
                    onBlur={() => save()}
                  />
                </div>
                <div className="lms-field">
                  <span className="lms-field__label">Response type</span>
                  <select
                    className="lms-input"
                    value={q.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const questions = [...form.questions];
                      questions[i] = {
                        ...q,
                        type,
                        options: type === 'mcq' && !q.options?.length
                          ? [newOption(), newOption()]
                          : q.options ?? [],
                      };
                      setForm((f) => ({ ...f, questions }));
                      save({ questions });
                    }}
                  >
                    <option value="written">Written answer</option>
                    <option value="file">File upload (e.g. PPT)</option>
                    <option value="mcq">Multiple choice (auto-graded)</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="lms-btn lms-btn--ghost lms-btn--sm"
                  onClick={() => {
                    const questions = form.questions.filter((_, idx) => idx !== i);
                    setForm((f) => ({ ...f, questions }));
                    save({ questions });
                  }}
                >
                  Remove
                </button>
              </div>

              {q.type === 'mcq' ? (
                <div style={{ marginTop: 4 }}>
                  <span className="lms-field__label">
                    Options
                    <span className="lms-field__optional"> mark the correct one</span>
                  </span>
                  {(q.options ?? []).map((o, oi) => (
                    <div
                      key={o._key}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}
                    >
                      <input
                        type="radio"
                        name={`correct-${q._key}`}
                        checked={Boolean(o.correct)}
                        onChange={() => {
                          const questions = [...form.questions];
                          const options = q.options.map((opt, idx) => ({
                            ...opt,
                            correct: idx === oi,
                          }));
                          questions[i] = { ...q, options };
                          setForm((f) => ({ ...f, questions }));
                          save({ questions });
                        }}
                        aria-label={`Option ${oi + 1} is correct`}
                      />
                      <input
                        className="lms-input"
                        style={{ flex: 1 }}
                        value={o.text}
                        placeholder={`Option ${oi + 1}`}
                        onChange={(e) => {
                          const questions = [...form.questions];
                          const options = [...q.options];
                          options[oi] = { ...o, text: e.target.value };
                          questions[i] = { ...q, options };
                          setForm((f) => ({ ...f, questions }));
                        }}
                        onBlur={() => save()}
                      />
                      <button
                        type="button"
                        className="lms-btn lms-btn--ghost lms-btn--sm"
                        disabled={(q.options ?? []).length <= 2}
                        onClick={() => {
                          const questions = [...form.questions];
                          const options = q.options.filter((_, idx) => idx !== oi);
                          questions[i] = { ...q, options };
                          setForm((f) => ({ ...f, questions }));
                          save({ questions });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="lms-btn lms-btn--sm"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      const questions = [...form.questions];
                      questions[i] = { ...q, options: [...(q.options ?? []), newOption()] };
                      setForm((f) => ({ ...f, questions }));
                      save({ questions });
                    }}
                  >
                    <LmsIcon name="plus" /> Add option
                  </button>
                </div>
              ) : (
                <div className="lms-field" style={{ marginTop: 4 }}>
                  <span className="lms-field__label">
                    Reference answer
                    <span className="lms-field__optional"> for you only — the learner never sees this</span>
                  </span>
                  <textarea
                    className="lms-textarea"
                    rows={2}
                    placeholder="What a good answer covers, for your own reference while marking"
                    value={q.referenceAnswer ?? ''}
                    onChange={(e) => {
                      const questions = [...form.questions];
                      questions[i] = { ...q, referenceAnswer: e.target.value };
                      setForm((f) => ({ ...f, questions }));
                    }}
                    onBlur={() => save()}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="lms-card" style={{ marginTop: 16 }}>
        <h2 className="lms-card__title">Marking criteria</h2>
        <textarea
          className="lms-textarea"
          rows={5}
          value={form.markingCriteria?.text ?? ''}
          onChange={(e) =>
            setForm((f) => ({ ...f, markingCriteria: { ...f.markingCriteria, text: e.target.value } }))
          }
          onBlur={() => save()}
        />
        <ul style={{ marginTop: 10 }}>
          {(form.markingCriteria?.attachments ?? []).map((a) => (
            <li key={a._id}>
              {a.name}{' '}
              <button
                type="button"
                className="lms-btn lms-btn--ghost lms-btn--sm"
                onClick={() => removeAttachment(a._id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <input
          type="file"
          onChange={(e) => e.target.files[0] && uploadAttachment(e.target.files[0], 'criteria')}
        />
      </div>

      {saving ? <p className="lms-empty">Saving…</p> : null}
      {err ? <p className="lms-field__error">{err}</p> : null}
    </div>
  );
}
