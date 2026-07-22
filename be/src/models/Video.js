import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// Plain video files hosted on S3 (NOT YouTube/Vimeo embeds). The admin uploads
// an mp4/webm; `file` holds the S3 key + public URL used by the <video> tag.
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

    // A video is EITHER an uploaded S3 file or an embedded YouTube link.
    source: { type: String, enum: ['upload', 'youtube'], default: 'upload', index: true },

    // The uploaded video asset on S3 (source === 'upload').
    file: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
      sizeBytes: { type: Number, default: 0 },
      mimeType: { type: String, default: '' },
    },

    // A pasted YouTube link (source === 'youtube'). `videoId` is parsed from the
    // URL so the frontend can build the thumbnail + embed without re-parsing.
    youtube: {
      url: { type: String, default: '' },
      videoId: { type: String, default: '' },
    },
    // Optional poster image shown before playback.
    thumbnail: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    durationSeconds: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.DRAFT, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

videoSchema.index({ title: 'text', description: 'text' });

export const Video = mongoose.model('Video', videoSchema);
