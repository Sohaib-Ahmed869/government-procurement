import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { recordAudit } from '../../models/AuditLog.js';
import { RegisterInterest } from '../../models/RegisterInterest.js';
import { Course } from '../../models/Course.js';

const STATUSES = ['new', 'contacted', 'converted', 'archived'];

// PUBLIC website form. Accepts a course "register interest" submission and, when
// a course id is supplied, denormalises its title for quick lists/exports.
export const create = asyncHandler(async (req, res) => {
  const { name, email, organisation, course, message } = req.body;
  if (!name || !email) throw ApiError.badRequest('name and email are required');

  const doc = { name, email };
  if (organisation) doc.organisation = organisation;
  if (message) doc.message = message;

  if (course) {
    const found = await Course.findById(course).select('title');
    if (!found) throw ApiError.badRequest('Course not found');
    doc.course = found._id;
    doc.courseTitle = found.title;
  }

  const submission = await RegisterInterest.create(doc);

  // Minimal confirmation payload — don't echo internal fields (status, notes...).
  return created(res, {
    id: submission._id,
    name: submission.name,
    email: submission.email,
    courseTitle: submission.courseTitle || '',
  });
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.course) filter.course = req.query.course;
  if (req.query.q) {
    const rx = new RegExp(req.query.q, 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const { items, meta } = await paginate(RegisterInterest, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items, meta);
});

// Escapes a value for CSV: wrap in quotes and double any embedded quotes.
function csvCell(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export const exportCsv = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.course) filter.course = req.query.course;

  const rows = await RegisterInterest.find(filter).sort('-createdAt');
  const header = ['name', 'email', 'organisation', 'courseTitle', 'status', 'createdAt'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name),
        csvCell(r.email),
        csvCell(r.organisation),
        csvCell(r.courseTitle),
        csvCell(r.status),
        csvCell(r.createdAt ? r.createdAt.toISOString() : ''),
      ].join(','),
    );
  }
  const csv = lines.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="register-interest.csv"');
  // Raw CSV, not the ok() envelope — this is a file download.
  return res.send(csv);
});

export const getById = asyncHandler(async (req, res) => {
  const submission = await RegisterInterest.findById(req.params.id);
  if (!submission) throw ApiError.notFound('Submission not found');
  return ok(res, submission);
});

export const update = asyncHandler(async (req, res) => {
  const submission = await RegisterInterest.findById(req.params.id);
  if (!submission) throw ApiError.notFound('Submission not found');

  if (req.body.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) {
      throw ApiError.badRequest(`status must be one of: ${STATUSES.join(', ')}`);
    }
    submission.status = req.body.status;
  }
  if (req.body.notes !== undefined) submission.notes = req.body.notes;

  await submission.save();
  recordAudit({
    req,
    action: 'registerInterest.update',
    entity: 'RegisterInterest',
    entityId: submission._id,
    summary: `Updated interest submission from ${submission.email}`,
  });
  return ok(res, submission);
});

export const remove = asyncHandler(async (req, res) => {
  const submission = await RegisterInterest.findById(req.params.id);
  if (!submission) throw ApiError.notFound('Submission not found');

  await submission.deleteOne();
  recordAudit({
    req,
    action: 'registerInterest.delete',
    entity: 'RegisterInterest',
    entityId: submission._id,
    summary: `Deleted interest submission from ${submission.email}`,
  });
  return noContent(res);
});
