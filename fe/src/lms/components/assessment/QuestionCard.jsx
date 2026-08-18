// One question, in whichever input its type calls for (L3). Controlled. The
// runner owns the answers object so a half-finished attempt survives navigating
// back and forth between questions.
export default function QuestionCard({ question, value, onChange, disabled = false }) {
  const { type, id } = question;

  if (type === 'text') {
    return (
      <div className="lms-q">
        <p className="lms-q__prompt">{question.prompt}</p>
        <input
          type="text"
          className="lms-input"
          value={value ?? ''}
          disabled={disabled}
          placeholder="Type your answer…"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (type === 'boolean') {
    return (
      <div className="lms-q">
        <p className="lms-q__prompt">{question.prompt}</p>
        <div className="lms-q__options">
          {[
            { id: 'true', text: 'True' },
            { id: 'false', text: 'False' },
          ].map((opt) => (
            <label key={opt.id} className={`lms-option${value === opt.id ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name={id}
                checked={value === opt.id}
                disabled={disabled}
                onChange={() => onChange(opt.id)}
              />
              <span>{opt.text}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  const multi = type === 'multi';
  const selected = multi ? (value ?? []) : value;

  const toggle = (optId) => {
    if (!multi) return onChange(optId);
    const set = new Set(selected);
    if (set.has(optId)) set.delete(optId);
    else set.add(optId);
    return onChange([...set]);
  };

  return (
    <div className="lms-q">
      <p className="lms-q__prompt">{question.prompt}</p>
      {multi ? <p className="lms-q__hint">Select all that apply.</p> : null}
      <div className="lms-q__options">
        {question.options.map((opt) => {
          const on = multi ? selected.includes(opt.id) : selected === opt.id;
          return (
            <label key={opt.id} className={`lms-option${on ? ' is-selected' : ''}`}>
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={id}
                checked={on}
                disabled={disabled}
                onChange={() => toggle(opt.id)}
              />
              <span>{opt.text}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
