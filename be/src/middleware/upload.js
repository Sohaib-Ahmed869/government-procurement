import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// In-memory storage: files arrive as buffers we forward straight to S3, so
// nothing hits the API server's disk.
const storage = multer.memoryStorage();

const IMAGE = /^image\/(png|jpe?g|webp|gif|svg\+xml|avif)$/;
const VIDEO = /^video\/(mp4|webm|ogg|quicktime|x-msvideo)$/;
const DOC = /^application\/pdf$/;

function fileFilter(allowed) {
  return (_req, file, cb) => {
    if (allowed.test(file.mimetype)) return cb(null, true);
    return cb(new ApiError(415, `Unsupported file type: ${file.mimetype}`));
  };
}

const limits = { fileSize: env.s3.maxUploadMb * 1024 * 1024 };

// Named uploaders for the different asset kinds.
export const uploadImage = multer({ storage, limits, fileFilter: fileFilter(IMAGE) });
export const uploadVideo = multer({ storage, limits, fileFilter: fileFilter(VIDEO) });
export const uploadMedia = multer({
  storage,
  limits,
  fileFilter: fileFilter(new RegExp(`${IMAGE.source}|${VIDEO.source}|${DOC.source}`)),
});
