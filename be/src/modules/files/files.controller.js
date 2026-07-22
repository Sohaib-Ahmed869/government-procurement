import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { getObject } from '../../config/s3.js';

// GET /files/<key> — streams a stored S3 object back to the browser with the
// right content-type, so a private bucket still serves public images/videos.
// The key can contain slashes (e.g. courses/uuid.png), captured via the wildcard.
export const streamFile = asyncHandler(async (req, res) => {
  const key = req.params[0];
  if (!key) throw ApiError.notFound('File not found');

  let out;
  try {
    out = await getObject(key);
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      throw ApiError.notFound('File not found');
    }
    throw err;
  }

  if (out.ContentType) res.setHeader('Content-Type', out.ContentType);
  if (out.ContentLength !== undefined) res.setHeader('Content-Length', out.ContentLength);
  if (out.ETag) res.setHeader('ETag', out.ETag);
  // Public, cacheable assets.
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Accept-Ranges', 'bytes');

  // out.Body is a Node Readable stream in the AWS SDK v3 Node runtime.
  out.Body.on('error', () => {
    if (!res.headersSent) res.status(500);
    res.end();
  });
  out.Body.pipe(res);
});
