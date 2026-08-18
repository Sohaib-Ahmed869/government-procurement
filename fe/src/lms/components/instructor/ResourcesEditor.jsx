import { useRef, useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import { authoringApi } from '../../../api/lms.js';
import { putToS3, sizeLabel } from '../../utils/s3Upload.js';

// The icon each kind gets in the list. The learner's list uses the same
// mapping, so a handout looks the same in the builder as it does in the course.
const ICON = {
  pdf: 'pdf',
  sheet: 'doc',
  slides: 'doc',
  zip: 'doc',
  image: 'media',
  link: 'link',
  doc: 'doc',
};

// Downloadable resources attached to ONE lesson (L1 / R1).
//
// Deliberately per-lesson rather than per-course: the slide deck belongs beside
// the video it was presented with, and a learner looking for it should find it
// on that lesson rather than in a single course-wide pile.
//
// A resource is either an uploaded file or a link to something already
// published. An upload goes browser → S3 on a presigned PUT, exactly like
// lesson video, and only the KEY is stored: the download is issued as an
// expiring signed URL, so it stays gated on the enrolment.
export default function ResourcesEditor({ courseId, resources = [], onChange }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState({ title: '', url: '' });

  const set = (i, patch) =>
    onChange(resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i) => onChange(resources.filter((_, idx) => idx !== i));

  const upload = async (file) => {
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      const { key, uploadUrl, kind } = await authoringApi.uploadUrl(
        courseId,
        file.name,
        file.type,
        'resource',
      );
      await putToS3(uploadUrl, file, setProgress);
      // Appended only once S3 has the bytes. Recording the key first would
      // leave the lesson offering a download that isn't there.
      onChange([
        ...resources,
        {
          // The filename is a sensible first title; it is editable right after.
          title: file.name.replace(/\.[^.]+$/, ''),
          key,
          name: file.name,
          kind: kind ?? 'doc',
          mimeType: file.type,
          sizeBytes: file.size,
        },
      ]);
    } catch (err) {
      setError(err?.message ?? 'The upload failed.');
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const addLink = () => {
    const url = link.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      setError('A link has to start with http:// or https://');
      return;
    }
    setError('');
    onChange([...resources, { title: link.title.trim() || url, url, kind: 'link' }]);
    setLink({ title: '', url: '' });
    setLinking(false);
  };

  return (
    <div className="lms-transcript-edit lms-resedit">
      <div className="lms-transcript-edit__head">
        <p className="lms-field__label" style={{ margin: 0 }}>
          Resources
          <span className="lms-field__optional">
            {' '}
            {resources.length
              ? `${resources.length} attached`
              : 'slides, checklists, templates'}
          </span>
        </p>
        <div className="lms-transcript-edit__tools">
          <button
            type="button"
            className="lms-btn lms-btn--sm"
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
          >
            <LmsIcon name="download" />
            Upload a file
          </button>
          <button
            type="button"
            className="lms-btn lms-btn--sm"
            onClick={() => { setLinking((v) => !v); setError(''); }}
          >
            <LmsIcon name="link" />
            Add a link
          </button>
        </div>
      </div>

      {progress !== null ? (
        <div className="lms-upload is-busy">
          <p className="lms-upload__label">
            {progress < 100 ? `Uploading… ${progress}%` : 'Finishing up…'}
          </p>
          <span className="lms-progress">
            <span className="lms-progress__fill" style={{ width: `${progress}%` }} />
          </span>
        </div>
      ) : null}

      {linking ? (
        <div className="lms-bulk">
          <div className="lms-formgrid">
            <label className="lms-field">
              <span className="lms-field__label">Title</span>
              <input
                className="lms-input"
                value={link.title}
                placeholder="AS 4000 general conditions"
                onChange={(e) => setLink((l) => ({ ...l, title: e.target.value }))}
              />
            </label>
            <label className="lms-field">
              <span className="lms-field__label">Link</span>
              <input
                className="lms-input"
                value={link.url}
                placeholder="https://…"
                onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))}
              />
            </label>
          </div>
          <div className="lms-bulk__actions">
            <button type="button" className="lms-btn lms-btn--sm" onClick={() => setLinking(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="lms-btn lms-btn--sm lms-btn--primary"
              onClick={addLink}
              disabled={!link.url.trim()}
            >
              Add resource
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="lms-field__error">{error}</p> : null}

      {resources.length === 0 ? (
        <p className="lms-empty" style={{ padding: '16px 0' }}>
          Nothing attached yet. Anything you add here appears under this lesson,
          and only enrolled learners can open it.
        </p>
      ) : (
        <ul className="lms-resrows">
          {resources.map((r, i) => (
            <li className="lms-resrow" key={r._id ?? r.key ?? r.url ?? i}>
              <span className="lms-upload__icon lms-resrow__icon">
                <LmsIcon name={ICON[r.kind] ?? 'doc'} />
              </span>
              <div className="lms-resrow__body">
                <input
                  className="lms-input"
                  value={r.title ?? ''}
                  placeholder="What the learner sees"
                  aria-label={`Resource ${i + 1} title`}
                  onChange={(e) => set(i, { title: e.target.value })}
                />
                <span className="lms-resrow__meta">
                  {r.url ? (
                    <>Link · {r.url}</>
                  ) : (
                    <>
                      {(r.kind ?? 'file').toUpperCase()}
                      {r.sizeBytes ? ` · ${sizeLabel(r.sizeBytes)}` : ''}
                      {r.name ? ` · ${r.name}` : ''}
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                className="lms-btn lms-btn--sm lms-btn--ghost"
                onClick={() => remove(i)}
                aria-label={`Remove resource ${i + 1}`}
              >
                <LmsIcon name="plus" className="lms-rotate45" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        className="lms-sr-only"
        onChange={(e) => upload(e.target.files?.[0])}
      />
    </div>
  );
}
