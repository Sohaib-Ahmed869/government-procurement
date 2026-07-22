import mongoose from 'mongoose';

// Media library (SF-04): every asset uploaded to S3 is catalogued here so it
// can be browsed and reused across content.
const mediaSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    key: { type: String, required: true, unique: true }, // S3 object key
    url: { type: String, required: true },
    kind: { type: String, enum: ['image', 'video', 'document'], required: true, index: true },
    mimeType: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 },
    width: { type: Number },
    height: { type: Number },
    alt: { type: String, default: '' },
    folder: { type: String, default: 'general', index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

mediaSchema.index({ filename: 'text', alt: 'text' });

export const Media = mongoose.model('Media', mediaSchema);
