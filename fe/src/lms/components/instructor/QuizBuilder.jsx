import LmsIcon from '../LmsIcon.jsx';
import Select from '../Select.jsx';

const TYPES = [
  { value: 'single', label: 'Single choice' },
  { value: 'multi', label: 'Multiple choice' },
  { value: 'boolean', label: 'True / false' },
  { value: 'text', label: 'Short answer' },
];

const letter = (i) => String.fromCharCode(97 + i);

// Quiz authoring (L3 / R1).
//
// The answer key is edited here and stored on the lesson. It must be stripped
// before the quiz is sent to a learner: Lesson.forLearner() on the server is
// what does that, and be/src/utils/grading.js is what marks against it.
export default function QuizBuilder({ quiz, onChange }) {
  const set = (patch) => onChange({ ...quiz, ...patch });

  const setQuestion = (id, patch) =>
    set({ questions: quiz.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });

  const addQuestion = () =>
    set({
      questions: [
        ...quiz.questions,
        {
          id: `q-${Date.now().toString(36)}`,
          type: 'single',
          prompt: '',
          options: [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
          ],
          correct: [],
          explanation: '',
        },
      ],
    });

  const removeQuestion = (id) => set({ questions: quiz.questions.filter((q) => q.id !== id) });

  const changeType = (q, type) => {
    // Switching type invalidates the old answer key, so it is cleared rather
    // than carried across. A "correct" answer pointing at a removed option is
    // worse than none.
    const patch = { type, correct: [] };
    if (type === 'text') patch.accept = q.accept ?? [''];
    if ((type === 'single' || type === 'multi') && !q.options?.length) {
      patch.options = [{ id: 'a', text: '' }, { id: 'b', text: '' }];
    }
    setQuestion(q.id, patch);
  };

  const toggleCorrect = (q, optId) => {
    if (q.type === 'multi') {
      const set_ = new Set(q.correct);
      if (set_.has(optId)) set_.delete(optId);
      else set_.add(optId);
      setQuestion(q.id, { correct: [...set_] });
    } else {
      setQuestion(q.id, { correct: [optId] });
    }
  };

  const addOption = (q) =>
    setQuestion(q.id, {
      options: [...q.options, { id: letter(q.options.length), text: '' }],
    });

  const removeOption = (q, optId) =>
    setQuestion(q.id, {
      options: q.options.filter((o) => o.id !== optId),
      correct: q.correct.filter((c) => c !== optId),
    });

  return (
    <div className="lms-quizbuild">
      <div className="lms-formgrid">
        <label className="lms-field">
          <span className="lms-field__label">Pass mark (%)</span>
          <input
            className="lms-input"
            type="number"
            min="0"
            max="100"
            value={quiz.passMark}
            onChange={(e) => set({ passMark: Number(e.target.value) })}
          />
        </label>
        <label className="lms-field">
          <span className="lms-field__label">Time limit (minutes)</span>
          <input
            className="lms-input"
            type="number"
            min="0"
            value={quiz.timeLimitMins}
            onChange={(e) => set({ timeLimitMins: Number(e.target.value) })}
          />
          <span className="lms-field__hint">0 for no limit.</span>
        </label>
      </div>

      {quiz.questions.length === 0 ? (
        <p className="lms-empty" style={{ padding: '18px 0' }}>
          No questions yet. Add the first one below.
        </p>
      ) : (
        <ol className="lms-questions">
          {quiz.questions.map((q, i) => (
            <li className="lms-qedit" key={q.id}>
              <div className="lms-qedit__head">
                <span className="lms-qedit__num">{i + 1}</span>
                <Select
                  value={q.type}
                  onChange={(v) => changeType(q, v)}
                  options={TYPES}
                  aria-label={`Question ${i + 1} type`}
                />
                <button
                  type="button"
                  className="lms-btn lms-btn--sm lms-btn--ghost"
                  onClick={() => removeQuestion(q.id)}
                >
                  Remove
                </button>
              </div>

              <textarea
                className="lms-textarea"
                rows={2}
                value={q.prompt}
                placeholder="Ask the question…"
                aria-label={`Question ${i + 1}`}
                onChange={(e) => setQuestion(q.id, { prompt: e.target.value })}
              />

              {q.type === 'boolean' ? (
                <div className="lms-qedit__bool">
                  <span className="lms-field__label">Correct answer</span>
                  {['true', 'false'].map((v) => (
                    <label key={v} className={`lms-option${q.correct[0] === v ? ' is-selected' : ''}`}>
                      <input
                        type="radio"
                        name={`c-${q.id}`}
                        checked={q.correct[0] === v}
                        onChange={() => setQuestion(q.id, { correct: [v] })}
                      />
                      <span>{v === 'true' ? 'True' : 'False'}</span>
                    </label>
                  ))}
                </div>
              ) : q.type === 'text' ? (
                <label className="lms-field">
                  <span className="lms-field__label">Accepted answers</span>
                  <input
                    className="lms-input"
                    value={(q.accept ?? []).join(', ')}
                    placeholder="transparency, procedural fairness"
                    onChange={(e) =>
                      setQuestion(q.id, {
                        accept: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                  <span className="lms-field__hint">
                    Comma separated. Matching ignores case and extra spaces.
                  </span>
                </label>
              ) : (
                <div className="lms-qedit__options">
                  <span className="lms-field__label">
                    Options: {q.type === 'multi' ? 'tick every correct one' : 'tick the correct one'}
                  </span>
                  {q.options.map((o) => (
                    <div className="lms-qedit__option" key={o.id}>
                      <input
                        type={q.type === 'multi' ? 'checkbox' : 'radio'}
                        name={`c-${q.id}`}
                        checked={q.correct.includes(o.id)}
                        onChange={() => toggleCorrect(q, o.id)}
                        aria-label={`Mark option ${o.id.toUpperCase()} correct`}
                      />
                      <input
                        className="lms-input"
                        value={o.text}
                        placeholder={`Option ${o.id.toUpperCase()}`}
                        onChange={(e) =>
                          setQuestion(q.id, {
                            options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)),
                          })
                        }
                      />
                      {q.options.length > 2 ? (
                        <button
                          type="button"
                          className="lms-btn lms-btn--sm lms-btn--ghost"
                          onClick={() => removeOption(q, o.id)}
                          aria-label={`Remove option ${o.id.toUpperCase()}`}
                        >
                          <LmsIcon name="plus" className="lms-rotate45" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="lms-btn lms-btn--sm" onClick={() => addOption(q)}>
                    <LmsIcon name="plus" />
                    Add option
                  </button>
                </div>
              )}

              <label className="lms-field">
                <span className="lms-field__label">
                  Explanation <span className="lms-field__optional">shown after marking</span>
                </span>
                <textarea
                  className="lms-textarea"
                  rows={2}
                  value={q.explanation}
                  placeholder="Why that's the answer. This is the part that teaches."
                  onChange={(e) => setQuestion(q.id, { explanation: e.target.value })}
                />
              </label>

              {q.type !== 'text' && q.correct.length === 0 ? (
                <p className="lms-field__error">No correct answer marked.</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <button type="button" className="lms-btn lms-btn--primary lms-btn--sm" onClick={addQuestion}>
        <LmsIcon name="plus" />
        Add question
      </button>
    </div>
  );
}
