import './EditorShell.css';

// Two-pane authoring layout shared by the article/course/page editors:
// a sticky action bar (back, title, save-state, Save / Publish) above a
// document column (children) and a settings rail (`sidebar`).
//
// Props: eyebrow, title, onBack, status, dirty, saving, savedAt, error,
//        onSave, onPublish, publishLabel, sidebar, children.
export default function EditorShell({
  eyebrow,
  title,
  onBack,
  status,
  dirty,
  saving,
  justSaved,
  error,
  onSave,
  onPublish,
  publishLabel = 'Publish',
  sidebar,
  children,
}) {
  const saveState = saving
    ? 'Saving…'
    : dirty
      ? 'Unsaved changes'
      : justSaved
        ? 'Saved'
        : 'All changes saved';

  return (
    <div className="editor">
      <div className="editor__bar">
        <div className="editor__bar-left">
          <button type="button" className="editor__back" onClick={onBack} aria-label="Back">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="editor__bar-meta">
            {eyebrow && <span className="editor__eyebrow">{eyebrow}</span>}
            <span className="editor__doc-title">{title || 'Untitled'}</span>
          </div>
          {status && <span className={`admin-badge admin-badge--${status}`}>{status}</span>}
        </div>

        <div className="editor__bar-right">
          <span className={`editor__savestate${dirty ? ' is-dirty' : ''}${justSaved ? ' is-saved' : ''}`}>
            {saveState}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn--sm"
            onClick={onSave}
            disabled={saving || (!dirty && !justSaved && false)}
          >
            Save draft
          </button>
          {onPublish && (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--sm"
              onClick={onPublish}
              disabled={saving}
            >
              {publishLabel}
            </button>
          )}
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error editor__error">{error}</div>}

      <div className="editor__grid">
        <div className="editor__main">{children}</div>
        <aside className="editor__aside">{sidebar}</aside>
      </div>
    </div>
  );
}
