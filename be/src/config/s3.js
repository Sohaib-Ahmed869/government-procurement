import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { env, s3Configured } from './env.js';
import { ApiError } from '../utils/ApiError.js';

// A single shared S3 client. It is created even without credentials so imports
// never throw; the guard in `assertS3()` blocks actual calls until the client
// pastes their keys into .env.
export const s3 = new S3Client({
  region: env.s3.region,
  credentials: s3Configured
    ? {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      }
    : undefined,
});

function assertS3() {
  if (!s3Configured) {
    throw new ApiError(
      503,
      'S3 is not configured yet. Add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and S3_BUCKET to be/.env.',
    );
  }
}

// Builds the URL used by the frontend to load a stored object.
// - If S3_PUBLIC_BASE_URL is set (a public bucket or CDN like CloudFront), use it.
// - Otherwise stream the object through this API's /files route, so a PRIVATE
//   bucket (the AWS default) still serves images without any bucket-policy change.
export function publicUrl(key) {
  if (!key) return '';
  if (env.s3.publicBaseUrl) {
    return `${env.s3.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
  return `${env.apiPublicUrl}/files/${key}`;
}

// Fetches an object from S3 for streaming back to the client (used by /files).
export async function getObject(key) {
  assertS3();
  return s3.send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }));
}

// Generates a unique, prefixed object key that keeps the original extension.
export function buildKey(folder, originalName) {
  const ext = originalName ? extname(originalName) : '';
  return `${folder.replace(/\/$/, '')}/${randomUUID()}${ext}`;
}

// Uploads an in-memory file buffer (from multer) to S3 and returns { key, url }.
export async function uploadBuffer({ buffer, mimeType, folder, originalName }) {
  assertS3();
  const key = buildKey(folder, originalName);
  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
  return { key, url: publicUrl(key) };
}

export async function deleteObject(key) {
  assertS3();
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
}

// A time-limited GET url — useful for private objects. Public assets can just
// use publicUrl().
export async function presignGet(key, expiresIn = 3600) {
  assertS3();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }),
    { expiresIn },
  );
}

// A presigned PUT url so large files (videos) can be uploaded straight from the
// browser to S3, bypassing the API server. Returns { key, uploadUrl, publicUrl }.
export async function presignPut({ folder, originalName, mimeType, expiresIn = 3600 }) {
  assertS3();
  const key = buildKey(folder, originalName);
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, ContentType: mimeType }),
    { expiresIn },
  );
  return { key, uploadUrl, publicUrl: publicUrl(key) };
}
