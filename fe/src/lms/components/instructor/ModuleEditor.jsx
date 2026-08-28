import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import DripScheduler from './DripScheduler.jsx';
import { dripModeOf, dripSummary } from '../../utils/gating.js';

const KIND_ICON = { text: 'text', video: 'video', quiz: 'quiz', youtube: 'play', doc: 'doc' };

// The curriculum tree (R1): modules, their lessons, and the controls to build
// them. Selection is lifted. The page owns which lesson is open so the editor
// beside this stays in step.
export default function ModuleEditor({
  modules,
  selectedId,
  onSelect,
  onAddModule,
  onRenameModule,
  onRemoveModule,
  onMoveModule,
  onAddLesson,
  onMoveLesson,
  onScheduleModule,
  // Renders the lesson editor INLINE, under the row that was clicked — the
  // accordion shape Udemy uses. Passed as a slot rather than imported here so
  // this component stays a list and knows nothing about lesson forms.
  renderLessonEditor,
}) {
  const [renaming, setRenaming] = useState(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(null); // module id whose kind picker is open
  const [scheduling, setScheduling] = useState(null); // module id whose drip panel is open

  const startRename = (m) => {
    setRenaming(m._id);
    setDraft(m.title);
  };

  const commitRename = (id) => {
    if (draft.trim()) onRenameModule(id, draft.trim());
    setRenaming(null);
  };

  return (
    <div className="lms-curriculum">
      {modules.length === 0 ? (
        <p className="lms-empty" style={{ padding: '20px 12px' }}>
          No modules yet. A module is a chapter. Add one to start.
        </p>
      ) : (
        modules.map((m, mi) => (
          <section className="lms-cmod" key={m._id} id={`section-${m._id}`}>
            <header className="lms-cmod__head">
              <span className="lms-cmod__order">{mi + 1}</span>

              {renaming === m._id ? (
                <input
                  className="lms-input lms-cmod__rename"
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(m._id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(m._id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                />
              ) : (
                <button type="button" className="lms-cmod__title" onClick={() => startRename(m)}>
                  <span className="lms-cmod__eyebrow">Section {mi + 1}</span>
                  {m.title}
                  <span className="lms-cmod__count">{m.lessons.length}</span>
                </button>
              )}

              <span className="lms-cmod__tools">
                <button type="button" className="lms-iconbtn" onClick={() => onMoveModule(m._id, -1)}
                  disabled={mi === 0} aria-label="Move module up" title="Move up">
                  <LmsIcon name="chevron" className="lms-flip" />
                </button>
                <button type="button" className="lms-iconbtn" onClick={() => onMoveModule(m._id, 1)}
                  disabled={mi === modules.length - 1} aria-label="Move module down" title="Move down">
                  <LmsIcon name="chevron" />
                </button>
                {/* Drip scheduling (L4). On the module rather than the lesson
                    because that is where the server holds it: a module is the
                    unit a cohort is released in. */}
                <button
                  type="button"
                  className={`lms-iconbtn${dripModeOf(m) === 'now' ? '' : ' is-on'}`}
                  onClick={() => setScheduling(scheduling === m._id ? null : m._id)}
                  aria-expanded={scheduling === m._id}
                  aria-label={`Release schedule for ${m.title}`}
                  title={dripSummary(m) || 'Release schedule'}
                >
                  <LmsIcon name="clock" />
                </button>
                <button type="button" className="lms-iconbtn is-danger" onClick={() => onRemoveModule(m._id)}
                  aria-label={`Delete module ${m.title}`} title="Delete module">
                  <LmsIcon name="plus" className="lms-rotate45" />
                </button>
              </span>
            </header>

            {/* A schedule is invisible until you open the panel otherwise, and a
                module that quietly stays shut for a week is exactly the thing an
                author needs reminding of while they build the one after it. */}
            {dripSummary(m) && scheduling !== m._id ? (
              <button
                type="button"
                className="lms-cmod__drip"
                onClick={() => setScheduling(m._id)}
              >
                <LmsIcon name="clock" />
                {dripSummary(m)}
              </button>
            ) : null}

            {scheduling === m._id ? (
              <DripScheduler
                module={m}
                onChange={(patch) => onScheduleModule(m._id, patch)}
                onClose={() => setScheduling(null)}
              />
            ) : null}

            <ul className="lms-clessons">
              {m.lessons.map((l, li) => (
                <li key={l._id}>
                  <button
                    type="button"
                    className={`lms-clesson${selectedId === l._id ? ' is-active' : ''}`}
                    onClick={() => onSelect(m._id, l._id)}
                  >
                    <LmsIcon name={KIND_ICON[l.kind] ?? 'text'} className="lms-clesson__icon" />
                    <span className="lms-clesson__num">{li + 1}</span>
                    <span className="lms-clesson__title">{l.title || 'Untitled lesson'}</span>
                    {l.preview ? <span className="lms-clesson__flag">Preview</span> : null}
                    <span className="lms-clesson__time">{l.minutes}m</span>
                  </button>
                  <span className="lms-clesson__tools">
                    <button type="button" className="lms-iconbtn" onClick={() => onMoveLesson(m._id, l._id, -1)}
                      disabled={li === 0} aria-label="Move lesson up" title="Move up">
                      <LmsIcon name="chevron" className="lms-flip" />
                    </button>
                    <button type="button" className="lms-iconbtn" onClick={() => onMoveLesson(m._id, l._id, 1)}
                      disabled={li === m.lessons.length - 1} aria-label="Move lesson down" title="Move down">
                      <LmsIcon name="chevron" />
                    </button>
                  </span>

                  {/* The editor opens here, under the lesson it belongs to, so
                      it is obvious which lesson is being edited and which
                      section it sits in. */}
                  {selectedId === l._id && renderLessonEditor ? (
                    <div className="lms-clesson__editor">{renderLessonEditor(l, m)}</div>
                  ) : null}
                </li>
              ))}
            </ul>

            {/* Choosing the kind up front means a new lesson opens with the
                right form, instead of defaulting to text and being switched. */}
            {adding === m._id ? (
              <div className="lms-addlesson">
                <p className="lms-addlesson__label">What kind of lesson?</p>
                {[
                  { kind: 'text', label: 'Text', icon: 'text' },
                  { kind: 'video', label: 'Video', icon: 'video' },
                  { kind: 'youtube', label: 'YouTube', icon: 'play' },
                  { kind: 'doc', label: 'Doc', icon: 'doc' },
                  { kind: 'quiz', label: 'Quiz', icon: 'quiz' },
                ].map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    className="lms-btn lms-btn--sm"
                    onClick={() => {
                      onAddLesson(m._id, k.kind);
                      setAdding(null);
                    }}
                  >
                    <LmsIcon name={k.icon} />
                    {k.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="lms-btn lms-btn--sm lms-btn--ghost lms-addlesson__cancel"
                  onClick={() => setAdding(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="lms-addbtn" onClick={() => setAdding(m._id)}>
                <LmsIcon name="plus" />
                Add a lesson to this section
              </button>
            )}
          </section>
        ))
      )}

      {/* Full width and at the very bottom, which is where someone looks after
          finishing a section. It reads as the end of the curriculum rather than
          one more control in a toolbar. */}
      <button type="button" className="lms-addsection" onClick={onAddModule}>
        <LmsIcon name="plus" />
        Add a new section
      </button>
    </div>
  );
}
