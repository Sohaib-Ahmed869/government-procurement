# S3 CORS — required for uploads and for encrypted video

Lesson video and resources are uploaded **straight from the browser to S3** on a
presigned PUT. The file never passes through the API, which is what keeps a
400 MB upload from tying up a request worker for its whole duration.

The cost of that design is that the bucket must allow the browser to talk to it
directly. Without a CORS rule the upload is blocked before it starts, and the
builder reports:

> The browser was blocked from uploading to storage. The S3 bucket needs a CORS
> rule allowing PUT from this site.

## The rule

S3 console → your bucket → **Permissions** → **Cross-origin resource sharing
(CORS)** → Edit. Paste this, with your own origins:

```json
[
  {
    "AllowedOrigins": [
      "https://government-procurement-xi.vercel.app",
      "https://staging.govprocurement.com.au",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Notes on each part, because the defaults people reach for are usually wrong:

- **`AllowedOrigins` must be exact.** Scheme, host and port, no trailing slash.
  A Vercel preview deploy is a *different* origin every time; add the stable
  production and staging domains, and use `http://localhost:5173` for local
  work rather than a wildcard.
- **`PUT` is the one that matters** for uploads. `GET`/`HEAD` are there for
  encrypted HLS video, which hls.js fetches by XHR — see `HLS_KEY_SECRET` in
  `.env.example`. Safari plays HLS natively and does not need them; Chrome,
  Firefox and Edge do.
- **`AllowedHeaders: ["*"]`** covers the `Content-Type` the presigned PUT is
  signed with. A signature is computed over specific headers, so restricting
  this list is a good way to produce a signature mismatch that reads as a
  permissions error.
- **`ExposeHeaders: ["ETag"]`** is what lets the browser read the upload's ETag
  back. Not required today; required the moment uploads become multipart.

## What this does NOT do

CORS is a browser rule, not an access control. It decides which *sites* may ask
the bucket for something; it is the presigned URL, and the bucket policy behind
it, that decide whether the answer is yes. Keep the bucket private.
