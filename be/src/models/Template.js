import mongoose from 'mongoose';
import { CONTENT_STATUS, CONTENT_STATUSES } from '../constants/statuses.js';

// B6 — one downloadable document in the Templates library.
//
// The documents are sourced and curated rather than written here, which is why
// half this schema is provenance. B6.1 makes licensing a hard gate, and a gate
// that lives only in a checklist is not a gate: `canPublish` below is the rule,
// and the controller refuses to set `status: published` until it passes.

// Kept in step with CATEGORIES in fe/src/features/templates/data.js. The same
// three the Prompt Library uses, because a template and a prompt answer the
// same question from the same two sides of the site.
export const TEMPLATE_CATEGORIES = ['award', 'win', 'other'];

// The formats the library hands out. No PDF: the brief is explicit that a
// download opens natively in Office, and a template you cannot edit is a
// picture of a template. PDF is allowed by the upload filter for the odd
// sourced guide, but such a file is not a Template.
export const TEMPLATE_FORMATS = ['word', 'excel', 'powerpoint'];

// The file extensions and media types each format is served as (B6.4). Held
// here rather than sniffed at download time so the Content-Type a browser gets
// is a decision we made, not whatever was guessed at upload.
export const FORMAT_MEDIA = {
  word: {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    legacy: { ext: 'doc', mime: 'application/msword' },
  },
  excel: {
    ext: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    legacy: { ext: 'xls', mime: 'application/vnd.ms-excel' },
  },
  powerpoint: {
    ext: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    legacy: { ext: 'ppt', mime: 'application/vnd.ms-powerpoint' },
  },
};

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, enum: TEMPLATE_CATEGORIES, required: true, index: true },
    // The middle level of the slicer, free text for the same reason it is on a
    // prompt: nobody can enumerate the use cases up front.
    useCase: { type: String, required: true, trim: true, index: true },
    useCaseOrder: { type: Number, default: 0 },
    format: { type: String, enum: TEMPLATE_FORMATS, required: true, index: true },

    // The stored document. `name` is the filename the visitor receives, kept
    // separately from the S3 key so a download arrives as
    // "Evaluation Plan Template.docx" rather than as a uuid.
    file: {
      key: { type: String, default: '' },
      url: { type: String, default: '' },
      name: { type: String, default: '' },
      size: { type: Number, default: 0 },
      mime: { type: String, default: '' },
    },

    // --- provenance (B6.1, B6.6) -------------------------------------------
    // Where the document came from. Free text plus an optional link, because
    // "adapted from the NSW Procurement Board's template" is as real an answer
    // as a URL.
    source: { type: String, default: '', trim: true },
    sourceUrl: { type: String, default: '', trim: true },

    licence: {
      // What permits us to hand this out: a licence name, "purchased",
      // "created in-house", "permission granted in writing".
      type: { type: String, default: '', trim: true },
      holder: { type: String, default: '', trim: true },
      url: { type: String, default: '', trim: true },
      // B6.6 — where the licence requires attribution, the page must show it.
      attributionRequired: { type: Boolean, default: false },
      attributionText: { type: String, default: '', trim: true },
      notes: { type: String, default: '', trim: true },
      // The sign-off. A name and a date, recorded when someone confirms the
      // licence actually permits publication.
      confirmedBy: { type: String, default: '', trim: true },
      confirmedAt: { type: Date, default: null },
    },

    // B6.8 — an aggregate tally and nothing else. No visitor, no session, no
    // timestamp per download: the question is "is this template useful", which
    // a single number answers without holding anything about who asked.
    downloads: { type: Number, default: 0 },

    order: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.DRAFT, index: true },
  },
  { timestamps: true },
);

// B6.1 — the hard gate, expressed once and used by the controller.
//
// Returns null when the document may be published, or the reason it may not.
// Deliberately a method on the model rather than a check in a route handler:
// there is one answer to "may this go live", and it should not be possible to
// add a second endpoint that forgets to ask.
templateSchema.methods.publishBlocker = function publishBlocker() {
  if (!this.file?.key) return 'a document has to be uploaded before it can be published';
  if (!this.source) return 'the source has to be recorded before it can be published';
  if (!this.licence?.type) return 'the licence has to be recorded before it can be published';
  if (!this.licence?.confirmedBy) {
    return 'the licence has to be checked and signed off before it can be published';
  }
  if (this.licence?.attributionRequired && !this.licence?.attributionText) {
    return 'this licence requires attribution, so the attribution text has to be written before it can be published';
  }
  return null;
};

// Defaults to DRAFT rather than PUBLISHED, unlike every other content model
// here. That is the gate again: a sourced document should never reach the site
// because somebody left a field alone.
templateSchema.index({ category: 1, useCaseOrder: 1, useCase: 1, order: 1, title: 1 });

export const Template = mongoose.model('Template', templateSchema);
