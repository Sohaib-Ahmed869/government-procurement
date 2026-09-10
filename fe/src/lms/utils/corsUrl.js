/* A URL for loading a media-bucket file in CORS mode — as a CSS mask, or into a
   canvas that is read back with toDataURL.

   S3 sends Access-Control-Allow-Origin only when the request carries an Origin,
   and its answer to a request WITHOUT one carries no `Vary: Origin`. So once an
   ordinary <img> has shown the file — the signature preview in the certificate
   builder does, right beside the certificate — the browser holds a copy with no
   CORS header, hands that same copy to the CORS request for the same URL, and
   the request is blocked: "No 'Access-Control-Allow-Origin' header is present".

   A marker query parameter gives the CORS loads a cache entry of their own, one
   that is only ever fetched with an Origin. S3 ignores it on a public object.
   `_cors`, not `cors`: `?cors` is an S3 subresource.

   Left alone: data: and blob: URLs, which need no CORS, and presigned URLs,
   whose signature covers the query string. */
export function corsSafeUrl(src) {
  if (!src || !/^https?:\/\//i.test(src)) return src;
  if (/[?&]X-Amz-Signature=/i.test(src)) return src;
  return `${src}${src.includes('?') ? '&' : '?'}_cors=1`;
}
