import { useRef, useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import { authoringApi } from '../../../api/lms.js';

/* Course cover image (R1).

   The website renders this on both the course card and the course detail hero,
   so a course without one looks broken in the catalogue, which is why the
   readiness check flags it.

   The file goes to the API, which puts it in the bucket and answers with the
   updated course. That round trip is the point: the URL the website renders has
   to be one the SERVER derived from the key it stored. An object URL made here
   would render perfectly in the builder and then be a dead link everywhere
   else, because it only exists inside this tab.

   It also means the image is saved the moment it is chosen, rather than riding
   along with the debounced course PATCH: a multipart upload isn't something to
   batch behind a text field.

   16:9 because that is what the card and hero both crop to. Telling an author
   the ratio up front beats them discovering their portrait photo is cropped
   through the middle. */
const MAX_BYTES = 5_000_000;

export default function ImageUploader({ courseId, image, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Keep it under 5 MB. This is a card image, not a print asset.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const course = await authoringApi.uploadImage(courseId, file);
      onChange(course.image);
    } catch (err) {
      setError(err?.message ?? 'The upload didn’t go through. Try again.');
    } finally {
      setBusy(false);
      // Clearing the input means choosing the same file twice still fires
      // onChange, which is what happens when someone re-exports and retries.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    setError('');
    setBusy(true);
    try {
      const course = await authoringApi.removeImage(courseId);
      onChange(course.image);
    } catch (err) {
      setError(err?.message ?? 'Could not remove the image.');
    } finally {
      setBusy(false);
    }
  };

  const hasImage = Boolean(image?.url);

  return (
    <div className="lms-imgup">
      {hasImage ? (
        <div className="lms-imgup__preview">
          <img src={image.url} alt="" />
          <div className="lms-imgup__overlay">
            <button
              type="button"
              className="lms-btn lms-btn--sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? 'Working…' : 'Replace'}
            </button>
            <button
              type="button"
              className="lms-btn lms-btn--sm lms-btn--danger"
              disabled={busy}
              onClick={remove}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="lms-imgup__drop"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
        >
          <LmsIcon name="media" className="lms-imgup__icon" />
          <span className="lms-imgup__title">
            {busy ? 'Uploading…' : 'Drop a cover image, or choose one'}
          </span>
          <span className="lms-imgup__hint">
            16:9 works best. It’s what the course card and page header both crop to.
            JPG or PNG, under 5 MB.
          </span>
        </button>
      )}

      {error ? <p className="lms-field__error">{error}</p> : null}
      {hasImage && !error ? (
        <p className="lms-field__hint">Saved. This is the image the website shows.</p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="lms-sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
