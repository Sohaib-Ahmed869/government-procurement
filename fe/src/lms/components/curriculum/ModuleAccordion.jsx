import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import LessonRow from './LessonRow.jsx';

function mins(n) {
  return n >= 60 ? `${Math.floor(n / 60)}h ${n % 60}m` : `${n}m`;
}

// One module and its lessons. Uses a real <button> with aria-expanded rather
// than <details>, so the open state can be controlled from the parent (the
// outline opens the module containing the learner's next lesson).
export default function ModuleAccordion({ slug, module: mod, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const done = mod.lessons.filter((l) => l.complete).length;
  const panelId = `mod-${mod.id}`;

  return (
    <div className={`lms-module${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="lms-module__head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <LmsIcon name="chevron" className="lms-module__chevron" />
        <span className="lms-module__body">
          <span className="lms-module__label">Module {mod.order}</span>
          <span className="lms-module__title">{mod.title}</span>
        </span>
        <span className="lms-module__meta">
          {mod.complete ? (
            <span className="lms-pill lms-pill--done">
              <LmsIcon name="check" />
              Complete
            </span>
          ) : (
            <span className="lms-module__count">
              {done}/{mod.lessons.length}
            </span>
          )}
          <span className="lms-module__time">{mins(mod.minutes)}</span>
        </span>
      </button>

      <ul className="lms-module__list" id={panelId} hidden={!open}>
        {mod.lessons.map((lesson) => (
          <LessonRow key={lesson.id} slug={slug} lesson={lesson} />
        ))}
      </ul>
    </div>
  );
}
