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
    /* status 0 on a cross-origin PUT means the browser blocked the RESPONSE.
       It cannot tell us why, and the two causes need different fixes:

         - the bucket has no CORS rule allowing PUT from this origin;
         - S3 rejected the request on its merits — a bad signature, an expired
           URL, a checksum mismatch — and that rejection carries no CORS
           headers either, so it arrives looking identical.

       The second is what a presigned URL carrying `x-amz-checksum-crc32` does
       (see requestChecksumCalculation in be/src/config/s3.js). Naming only CORS
       here sent a real debugging session to the wrong place, so the message now
       names both and says which to check first. */
    xhr.onerror = () =>
      reject(
        new Error(
          xhr.status === 0
            ? 'Storage refused the upload. Check the S3 bucket has a CORS rule allowing PUT from this site — see docs/S3-CORS.md.'
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
