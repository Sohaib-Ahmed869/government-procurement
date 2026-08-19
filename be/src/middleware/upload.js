import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// In-memory storage: files arrive as buffers we forward straight to S3, so
// nothing hits the API server's disk.
const storage = multer.memoryStorage();

const IMAGE = /^image\/(png|jpe?g|webp|gif|svg\+xml|avif)$/;
const VIDEO = /^video\/(mp4|webm|ogg|quicktime|x-msvideo)$/;
const DOC = /^application\/pdf$/;

// B6 — the Office formats the Templates library hands out. Long and ugly by
// nature: the modern ones are the OpenXML media types, and the three legacy
// ones are kept because a sourced template is often an older .doc/.xls/.ppt and
// converting it would be exactly the PDF-ing the brief rules out.
//
// `application/octet-stream` is deliberately NOT here. Some browsers send it
// for an Office file they cannot identify, and allowing it would turn this
// filter into no filter at all.
const OFFICE = new RegExp(
  '^application/(' +
    [
      'msword',
      'vnd\.ms-excel',
      'vnd\.ms-powerpoint',
      'vnd\.openxmlformats-officedocument\.wordprocessingml\.document',
      'vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet',
      'vnd\.openxmlformats-officedocument\.presentationml\.presentation',
    ].join('|') +
    ')$',
);

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
// B6 — Templates library uploads: Office documents, plus PDF for the odd
// sourced guide that only exists as one.
export const uploadDocument = multer({
  storage,
  limits,
  fileFilter: fileFilter(new RegExp(`${OFFICE.source}|${DOC.source}`)),
});

export const uploadMedia = multer({
  storage,
  limits,
  fileFilter: fileFilter(new RegExp(`${IMAGE.source}|${VIDEO.source}|${DOC.source}`)),
});
