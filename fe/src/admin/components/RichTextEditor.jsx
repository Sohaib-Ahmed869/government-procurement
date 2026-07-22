import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaApi } from '../../api';
import './RichTextEditor.css';

// A self-contained WYSIWYG editor. Controlled via `value` (HTML string) and
// `onChange` (called with the editable div's innerHTML). Supports inline image
// upload (to S3 via the media API), live word count, and active-state toolbar
// highlighting. Formatting uses document.execCommand — still the pragmatic
// cross-browser path for inline rich text without a heavy dependency.
//
// Props:
//   value, onChange, placeholder
//   onStats({ words, minutes }) — optional, fired as the content changes.
export default function RichTextEditor({ value = '', onChange, placeholder = 'Start writing…', onStats }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const savedRange = useRef(null);
  const [active, setActive] = useState({});
  const [stats, setStats] = useState({ words: 0, minutes: 0 });
  const [uploading, setUploading] = useState(false);

  // Sync DOM with `value` from the outside (e.g. initial load) without resetting
  // the caret on every keystroke.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = value || '';
    if (el.innerHTML !== next) el.innerHTML = next;
    computeStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const computeStats = useCallback(() => {
    const text = (ref.current?.innerText || '').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.round(words / 200));
    const s = { words, minutes };
    setStats(s);
    onStats?.(s);
  }, [onStats]);

  const emitChange = () => {
    if (onChange && ref.current) onChange(ref.current.innerHTML);
    computeStats();
  };

  // Remember the selection so it survives focus leaving the editor (e.g. the
  // file picker) and can be restored before inserting an image/link.
  const rememberSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  // Reflect the current selection's formatting on the toolbar.
  const syncActive = useCallback(() => {
    if (!ref.current || document.activeElement !== ref.current) return;
    try {
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
      });
    } catch {
      /* queryCommandState can throw in odd states — ignore */
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', syncActive);
    return () => document.removeEventListener('selectionchange', syncActive);
  }, [syncActive]);

  const exec = (command, arg = null) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
    syncActive();
  };

  const formatBlock = (tag) => exec('formatBlock', tag);

  const insertLink = () => {
    rememberSelection();
    const url = window.prompt('Enter the link URL:', 'https://');
    restoreSelection();
    if (url) exec('createLink', url);
  };

  const pickImage = () => {
    rememberSelection();
    fileRef.current?.click();
  };

  const onImagePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const media = await mediaApi.upload(file, { folder: 'article-body' });
      restoreSelection();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${media.url}" alt="" style="max-width:100%;border-radius:10px;margin:14px 0;" /><p><br/></p>`,
      );
      emitChange();
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(`Image upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const Btn = ({ onClick, title, isActive, children, wide }) => (
    <button
      type="button"
      className={`rte__btn${isActive ? ' is-active' : ''}${wide ? ' rte__btn--wide' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={isActive || undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );

  return (
    <div className="rte">
      <div className="rte__toolbar" role="toolbar" aria-label="Text formatting">
        <Btn title="Bold" isActive={active.bold} onClick={() => exec('bold')}>
          <strong>B</strong>
        </Btn>
        <Btn title="Italic" isActive={active.italic} onClick={() => exec('italic')}>
          <em>I</em>
        </Btn>
        <Btn title="Underline" isActive={active.underline} onClick={() => exec('underline')}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </Btn>
        <span className="rte__sep" aria-hidden="true" />
        <Btn title="Heading 2" onClick={() => formatBlock('h2')}>H2</Btn>
        <Btn title="Heading 3" onClick={() => formatBlock('h3')}>H3</Btn>
        <Btn title="Paragraph" onClick={() => formatBlock('p')}>P</Btn>
        <Btn title="Quote" onClick={() => formatBlock('blockquote')}>❝</Btn>
        <span className="rte__sep" aria-hidden="true" />
        <Btn title="Bullet list" isActive={active.ul} onClick={() => exec('insertUnorderedList')}>•</Btn>
        <Btn title="Numbered list" isActive={active.ol} onClick={() => exec('insertOrderedList')}>1.</Btn>
        <span className="rte__sep" aria-hidden="true" />
        <Btn title="Insert link" onClick={insertLink}>🔗</Btn>
        <Btn title="Insert image" onClick={pickImage}>
          {uploading ? '…' : '🖼'}
        </Btn>
        <Btn title="Clear formatting" onClick={() => exec('removeFormat')} wide>Clear</Btn>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImagePicked} />
      </div>

      <div
        ref={ref}
        className="rte__editable"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        onKeyUp={syncActive}
        onMouseUp={syncActive}
      />

      <div className="rte__footer">
        <span>{stats.words} words</span>
        <span>·</span>
        <span>~{stats.minutes} min read</span>
        {uploading && <span className="rte__uploading">Uploading image…</span>}
      </div>
    </div>
  );
}
