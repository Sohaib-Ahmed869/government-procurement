// Browser → S3 uploads (R1).
//
// Extracted so the video attach and the lesson-resource attach share one
// implementation. They upload to the same presigned-PUT endpoint under the same
// rules, and the interesting part — what a cross-origin failure actually means
// — is not something worth getting right twice.

// Uploads through XMLHttpRequest rather than fetch for one reason: fetch has no
// upload progress event, and a silent bar on a 400 MB file looks like a hang.
export function putToS3(url, file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    // Must match the type the URL was signed with, or S3 rejects the signature.
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      (xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage rejected the upload (${xhr.status})`)));
    // status 0 on a cross-origin PUT means the response was blocked, not that
    // the request failed. S3 may well have stored the file. Saying "check your
    // connection" sends whoever hits this to look in the wrong place, so it
    // names the actual cause.
    xhr.onerror = () =>
      reject(
        new Error(
          xhr.status === 0
            ? 'The browser was blocked from uploading to storage. The S3 bucket needs a CORS rule allowing PUT from this site.'
            : `The upload failed (${xhr.status}).`,
        ),
      );
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(file);
  });
}

export function sizeLabel(bytes) {
  if (!bytes) return '';
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}
