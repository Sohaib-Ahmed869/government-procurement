import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import AdvisorDisclaimer from './AdvisorDisclaimer.jsx';
import AdvisorResult from './AdvisorResult.jsx';
import { useChromeHeight } from '../../../hooks/useChromeHeight.js';
import { evaluate } from '../engine.js';
import './AdvisorStepper.css';

// A6 — the stepper.
//
// One step per group in the rule pack, and the questions inside a step are
// whichever of its members currently apply: `showIf` is re-run against the
// answers on every render, so answering "ICT" earlier makes the ICT questions
// appear and answering "business" makes them disappear again.
//
// A step with nothing to ask is skipped rather than shown empty, which is why
// Next and Back both walk the *visible* steps rather than the full list.
//
// Nothing here is stored. Answers live in component state for the length of the
// visit and go nowhere else — no fetch, no localStorage, no analytics event.
// See the note in ProcurementAdvisorPage.jsx.
function isVisible(question, answers) {
  return typeof question.showIf === 'function' ? Boolean(question.showIf(answers)) : true;
}

function isAnswered(question, answers) {
  const v = answers[question.id];
  if (question.type === 'multi') return Array.isArray(v);
  if (question.type === 'bool') return v === true || v === false;
  if (question.type === 'number') return v !== undefined && v !== null && v !== '';
  return Boolean(v);
}

export default function AdvisorStepper({ rules, onExit }) {
  // Moving between steps returns the reader to the top of the form. Without it
  // they land wherever the previous step happened to leave them — halfway down
  // a question list, with the step heading and the disclaimer both above the
  // fold, which reads as the page not having changed at all.
  const topRef = useRef(null);
  const chrome = useChromeHeight();
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [result, setResult] = useState(null);

  const byId = useMemo(
    () => Object.fromEntries(rules.questions.map((q) => [q.id, q])),
    [rules],
  );

  // The steps that currently have at least one question to ask.
  const steps = useMemo(
    () =>
      rules.steps
        .map((step) => ({
          ...step,
          items: step.questions
            .map((id) => byId[id])
            .filter((q) => q && isVisible(q, answers)),
        }))
        .filter((step) => step.items.length > 0),
    [rules, byId, answers],
  );

  // Answering a question can remove the step you are on. Clamping here rather
  // than in an effect keeps the render consistent with the answers that caused
  // it, instead of painting an out-of-range step for a frame first.
  const safeIndex = Math.min(index, Math.max(0, steps.length - 1));
  const step = steps[safeIndex];

  const set = (id, value) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setShowErrors(false);
  };

  const missing = step
    ? step.items.filter((q) => q.required && !isAnswered(q, answers))
    : [];

  const isLast = safeIndex === steps.length - 1;

  const next = () => {
    if (missing.length) {
      setShowErrors(true);
      return;
    }
    if (isLast) {
      setResult(evaluate(rules, answers));
      return;
    }
    setIndex(safeIndex + 1);
    setShowErrors(false);
  };

  const back = () => {
    if (safeIndex === 0) {
      onExit?.();
      return;
    }
    setIndex(safeIndex - 1);
    setShowErrors(false);
  };

  // Scrolls the form's own top edge under the sticky chrome. Skipped on the
  // first render — arriving on the page should not yank the view.
  const firstRender = useRef(true);
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = topRef.current;
    if (!el) return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const y = el.getBoundingClientRect().top + window.scrollY - chrome - 16;
    // Only ever scrolls up. Someone who has read past the top of a short step
    // should not be dragged back down to it.
    if (y < window.scrollY) {
      window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [safeIndex, result, chrome]);

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setShowErrors(false);
  };

  if (result) {
    return (
      <div ref={topRef}>
        <AdvisorResult
          result={result}
          rules={rules}
          answers={answers}
          onRestart={restart}
          onExit={onExit}
        />
      </div>
    );
  }

  if (!step) return null;

  return (
    <div className="adv-step" ref={topRef}>
      {/* A6.9/A6.10 — shown before a single question is answered, not only on
          the result. */}
      <AdvisorDisclaimer />

      <ol className="adv-step__rail" aria-label="Progress">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={`adv-step__rail-item${i === safeIndex ? ' is-current' : ''}${i < safeIndex ? ' is-done' : ''}`}
            aria-current={i === safeIndex ? 'step' : undefined}
          >
            <span className="adv-step__rail-no">{String(i + 1).padStart(2, '0')}</span>
            <span className="adv-step__rail-label">{s.title}</span>
          </li>
        ))}
      </ol>

      <div className="adv-step__panel">
        <p className="adv-step__count">
          Step {safeIndex + 1} of {steps.length}
        </p>
        <h2 className="adv-step__title">{step.title}</h2>

        <div className="adv-step__questions">
          {step.items.map((q) => (
            <Question
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={(v) => set(q.id, v)}
              invalid={showErrors && q.required && !isAnswered(q, answers)}
            />
          ))}
        </div>

        {showErrors && missing.length > 0 && (
          <p className="adv-step__error" role="alert">
            {missing.length === 1
              ? 'One question above still needs an answer.'
              : `${missing.length} questions above still need an answer.`}
          </p>
        )}

        <div className="adv-step__actions">
          <button type="button" className="adv-btn adv-btn--ghost" onClick={back}>
            {safeIndex === 0 ? 'Choose another jurisdiction' : 'Back'}
          </button>
          <button type="button" className="adv-btn adv-btn--primary" onClick={next}>
            {isLast ? 'See the approach' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

// One question, rendered by type. Radios rather than a <select> for the option
// sets: every choice carries its own help text, and a native dropdown has
// nowhere to put it.
function Question({ question, value, onChange, invalid }) {
  const { id, type, label, help, options = [], prefix, suffix, min, max, step = 1 } = question;

  // Stepping stays inside the question's own bounds, so the arrows can never
  // put the field into a state the form would then reject.
  const nudge = (delta) => {
    const next = (Number(value) || 0) + delta;
    const floored = min == null ? next : Math.max(min, next);
    onChange(max == null ? floored : Math.min(max, floored));
  };
  const describedBy = help ? `${id}-help` : undefined;

  return (
    <fieldset className={`adv-q${invalid ? ' is-invalid' : ''}`}>
      <legend className="adv-q__label">
        {label}
        {question.required && <span className="adv-q__req" aria-hidden="true"> *</span>}
      </legend>
      {help && (
        <p className="adv-q__help" id={describedBy}>
          {help}
        </p>
      )}

      {type === 'select' && (
        <div className="adv-q__options">
          {options.map((o) => (
            <label className="adv-opt" key={o.value}>
              <input
                type="radio"
                name={id}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <span className="adv-opt__body">
                <span className="adv-opt__label">{o.label}</span>
                {o.help && <span className="adv-opt__help">{o.help}</span>}
              </span>
            </label>
          ))}
        </div>
      )}

      {type === 'multi' && (
        <div className="adv-q__options">
          {options.map((o) => {
            const list = Array.isArray(value) ? value : [];
            return (
              <label className="adv-opt" key={o.value}>
                <input
                  type="checkbox"
                  checked={list.includes(o.value)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...list, o.value]
                        : list.filter((v) => v !== o.value),
                    )
                  }
                />
                <span className="adv-opt__body">
                  <span className="adv-opt__label">{o.label}</span>
                  {o.help && <span className="adv-opt__help">{o.help}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {type === 'bool' && (
        <div className="adv-q__options adv-q__options--inline">
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map((o) => (
            <label className="adv-opt adv-opt--inline" key={String(o.value)}>
              <input
                type="radio"
                name={id}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <span className="adv-opt__body">
                <span className="adv-opt__label">{o.label}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {type === 'number' && (
        <div className="adv-q__number">
          {prefix && <span className="adv-q__affix">{prefix}</span>}
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value ?? ''}
            aria-describedby={describedBy}
            onChange={(e) =>
              onChange(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
          {/* Explicit steppers, because the native ones are invisible on a
              phone: mobile browsers do not paint the spinner at all, so the
              value could be stepped (a scroll over the field still works) with
              nothing on screen saying so. These are the same control, drawn.
              `tabIndex={-1}` keeps them out of the keyboard path, where the
              arrow keys already step the input. */}
          <span className="adv-q__spin" aria-hidden="true">
            <button type="button" className="adv-q__step" tabIndex={-1} onClick={() => nudge(step)}>
              ▲
            </button>
            <button type="button" className="adv-q__step" tabIndex={-1} onClick={() => nudge(-step)}>
              ▼
            </button>
          </span>
          {suffix && <span className="adv-q__affix">{suffix}</span>}
        </div>
      )}
    </fieldset>
  );
}
