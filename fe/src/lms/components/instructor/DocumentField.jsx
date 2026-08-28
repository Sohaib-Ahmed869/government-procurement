import { useRef, useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import { authoringApi } from '../../../api/lms.js';

function sizeLabel(bytes) {
  if (!bytes) return '';
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

// XHR rather than fetch, for the upload progress event fetch doesn't provide.
function putToS3(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      (xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage rejected the upload (${xhr.status})`)));
    xhr.onerror = () =>
      reject(
        new Error(
          xhr.status === 0
            ? 'Storage refused the upload. Check the S3 bucket has a CORS rule allowing PUT from this site — see docs/S3-CORS.md.'
            : `The upload failed (${xhr.status}).`,
        ),
      );
    xhr.send(file);
  });
}

// A documentation lesson: a file to read, or a link to one already published.
//
// Deliberately one or the other, never both. Holding both would leave the
// learner page choosing which wins, and it would choose differently from this
// editor's preview sooner or later. The server enforces the same rule.
export default function DocumentField({ courseId, document: doc, onChange }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(doc?.url ? 'link' : 'file');

  const pick = async (file) => {
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      const { key, uploadUrl } = await authoringApi.uploadUrl(
        courseId, file.name, file.type, 'document',
      );
      await putToS3(uploadUrl, file, setProgress);
      // Saved only once storage has the bytes, so a lesson can't end up
      // pointing at a file that never arrived.
      onChange({
        ...doc,
        url: '',
        key,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    } catch (err) {
      setError(err?.message ?? 'The upload failed.');
    } finally {
      setProgress(null);
    }
  };

  const switchTo = (next) => {
    setMode(next);
    setError('');
    // Clear the other side, so the two can never both be set.
    onChange(next === 'link'
      ? { ...doc, key: '', mimeType: '', sizeBytes: 0 }
      : { ...doc, url: '' });
  };

  return (
    <div className="lms-doc">
      <div className="lms-segmented lms-doc__modes">
        <button
          type="button"
          className={`lms-segmented__btn${mode === 'file' ? ' is-active' : ''}`}
          onClick={() => switchTo('file')}
        >
          Upload a file
        </button>
        <button
          type="button"
          className={`lms-segmented__btn${mode === 'link' ? ' is-active' : ''}`}
          onClick={() => switchTo('link')}
        >
          Link to one
        </button>
      </div>

      {mode === 'link' ? (
        <label className="lms-field">
          <span className="lms-field__label">Document URL</span>
          <input
            className="lms-input"
            value={doc?.url ?? ''}
            placeholder="https://www.finance.gov.au/..."
            onChange={(e) => onChange({ ...doc, url: e.target.value, key: '' })}
          />
          <span className="lms-field__hint">
            Opens in a new tab. A linked document is public, so it isn’t gated on
            enrolment the way an uploaded one is.
          </span>
        </label>
      ) : progress !== null ? (
        <div className="lms-upload is-busy">
          <p className="lms-upload__label">
            {progress < 100 ? `Uploading… ${progress}%` : 'Finishing up…'}
          </p>
          <span className="lms-progress">
            <span className="lms-progress__fill" style={{ width: `${progress}%` }} />
          </span>
        </div>
      ) : doc?.key ? (
        <div className="lms-upload is-done">
          <span className="lms-upload__icon"><LmsIcon name="doc" /></span>
          <div className="lms-upload__body">
            <p className="lms-upload__name">{doc.name}</p>
            <p className="lms-upload__meta">
              {sizeLabel(doc.sizeBytes)} · served through an expiring link
            </p>
          </div>
          <div className="lms-upload__actions">
            <button type="button" className="lms-btn lms-btn--sm" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button
              type="button"
              className="lms-btn lms-btn--sm lms-btn--danger"
              onClick={() => onChange({ ...doc, key: '', name: '', mimeType: '', sizeBytes: 0 })}
            >
              Remove
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            className="lms-sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div
          className="lms-upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
        >
          <span className="lms-upload__icon"><LmsIcon name="doc" /></span>
          <div className="lms-upload__body">
            <p className="lms-upload__name">Drop a document here, or choose a file</p>
            <p className="lms-upload__meta">PDF, Word or PowerPoint.</p>
            {error ? <p className="lms-field__error">{error}</p> : null}
          </div>
          <button type="button" className="lms-btn lms-btn--sm lms-btn--primary" onClick={() => inputRef.current?.click()}>
            Choose file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            className="lms-sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>
      )}

      {error && mode === 'file' && doc?.key ? <p className="lms-field__error">{error}</p> : null}

      <label className="lms-field">
        <span className="lms-field__label">Why they’re reading it (optional)</span>
        <textarea
          className="lms-textarea"
          rows={3}
          value={doc?.summary ?? ''}
          placeholder="A line of context, shown above the document."
          onChange={(e) => onChange({ ...doc, summary: e.target.value })}
        />
      </label>
    </div>
  );
}
