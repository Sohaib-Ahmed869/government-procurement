import './EditorShell.css';

// Two-pane authoring layout shared by the article/course/page editors:
// a sticky action bar (back, title, save-state, Save / Publish) above a
// document column (children) and a settings rail (`sidebar`).
//
// Props: eyebrow, title, onBack, status, dirty, saving, savedAt, error, notice,
//        onSave, saveLabel, onPublish, publishLabel, sidebar, children.
//
// `error` is a failure; `notice` is for something the editor did on the author's
// behalf that they need to know about (e.g. dropping a featured flag because the
// homepage slots filled up while the draft sat unpublished).
export default function EditorShell({
  eyebrow,
  title,
  onBack,
  status,
  dirty,
  saving,
  justSaved,
  error,
  notice,
  onSave,
  saveLabel = 'Save draft',
  onPublish,
  publishLabel = 'Publish',
  sidebar,
  children,
}) {
  // Label and colour are picked together — they used to be two independent
  // expressions, which let a saved-but-still-dirty render show "Unsaved changes"
  // in the green just-saved colour.
  const saveState = saving
    ? { label: 'Saving…', tone: '' }
    : dirty
      ? { label: 'Unsaved changes', tone: ' is-dirty' }
      : justSaved
        ? { label: 'Changes saved', tone: ' is-saved' }
        : { label: 'All changes saved', tone: '' };

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
          <span className={`editor__savestate${saveState.tone}`}>{saveState.label}</span>
          <button
            type="button"
            className="admin-btn admin-btn--sm"
            onClick={onSave}
            disabled={saving}
          >
            {saveLabel}
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
      {notice && (
        <div className="admin-alert admin-alert--warning editor__error" role="status">
          {notice}
        </div>
      )}

      <div className="editor__grid">
        <div className="editor__main">{children}</div>
        <aside className="editor__aside">{sidebar}</aside>
      </div>
    </div>
  );
}
