import { useRef, useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import { authoringApi } from '../../../api/lms.js';
import { putToS3, sizeLabel } from '../../utils/s3Upload.js';

/* Video attach for a lesson (L2 / R1).

   The file does NOT pass through the API. Course video is large, and streaming
   it through Express would tie up a worker for the length of the upload, so
   the server issues a presigned PUT and the browser sends the file straight to
   S3.

   Only the KEY is stored, never a readable URL: playback goes through the
   expiring signed-GET endpoint, so a lesson row must not carry a link that
   works without one. */
export default function MediaUploader({ courseId, video, onChange }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const pick = async (file) => {
    if (!file) return;
    setError('');
    setProgress(0);
    try {
      const { key, uploadUrl } = await authoringApi.uploadUrl(courseId, file.name, file.type, 'video');
      await putToS3(uploadUrl, file, setProgress);
      // Saved only after S3 has the bytes. Recording the key first would leave
      // the lesson pointing at an object that doesn't exist, which is exactly
      // what a video that 404s on playback looks like.
      onChange({
        key,
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err?.message ?? 'The upload failed.');
    } finally {
      setProgress(null);
    }
  };

  if (progress !== null) {
    return (
      <div className="lms-upload is-busy">
        <p className="lms-upload__label">
          {progress < 100 ? `Uploading… ${progress}%` : 'Finishing up…'}
        </p>
        <span className="lms-progress">
          <span className="lms-progress__fill" style={{ width: `${progress}%` }} />
        </span>
      </div>
    );
  }

  if (video) {
    return (
      <div className="lms-upload is-done">
        <span className="lms-upload__icon">
          <LmsIcon name="video" />
        </span>
        <div className="lms-upload__body">
          <p className="lms-upload__name">{video.name}</p>
          <p className="lms-upload__meta">
            {sizeLabel(video.sizeBytes)} · stored as <code>{video.key}</code>
          </p>
        </div>
        <div className="lms-upload__actions">
          <button type="button" className="lms-btn lms-btn--sm" onClick={() => inputRef.current?.click()}>
            Replace
          </button>
          <button type="button" className="lms-btn lms-btn--sm lms-btn--danger" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
        {error ? <p className="lms-field__error">{error}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="lms-sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
    <div
      className="lms-upload"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pick(e.dataTransfer.files?.[0]);
      }}
    >
      <span className="lms-upload__icon">
        <LmsIcon name="video" />
      </span>
      <div className="lms-upload__body">
        <p className="lms-upload__name">Drop a video here, or choose a file</p>
        <p className="lms-upload__meta">MP4, MOV or WebM. Uploaded straight to storage, not through the site.</p>
        {/* A failed upload has to say so here. Silently leaving the drop zone
            empty is what let a lesson end up with a video that never arrived. */}
        {error ? <p className="lms-field__error">{error}</p> : null}
      </div>
      <button type="button" className="lms-btn lms-btn--sm lms-btn--primary" onClick={() => inputRef.current?.click()}>
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="lms-sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
