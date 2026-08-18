import { useState } from 'react';
import ModuleAccordion from './ModuleAccordion.jsx';

// The full course structure (L1). Opens on the module holding the learner's
// next lesson so they land where they left off; falls back to the first module
// for anyone who hasn't started.
export default function OutlineTree({ slug, modules, nextLessonId }) {
  const currentIndex = Math.max(
    0,
    modules.findIndex((m) => m.lessons.some((l) => l.id === nextLessonId || l.current)),
  );
  const [allOpen, setAllOpen] = useState(false);

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const totalMinutes = modules.reduce((s, m) => s + m.minutes, 0);

  return (
    <div className="lms-outline">
      <div className="lms-outline__head">
        <p className="lms-outline__summary">
          {modules.length} modules · {totalLessons} lessons ·{' '}
          {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
        </p>
        <button
          type="button"
          className="lms-btn lms-btn--sm lms-btn--ghost"
          onClick={() => setAllOpen((v) => !v)}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="lms-outline__list">
        {modules.map((mod, i) => (
          // Remounting on allOpen lets the toggle drive every module's initial
          // state without lifting each accordion's open state into this list.
          <ModuleAccordion
            key={`${mod.id}-${allOpen}`}
            slug={slug}
            module={mod}
            defaultOpen={allOpen || i === currentIndex}
          />
        ))}
      </div>
    </div>
  );
}
