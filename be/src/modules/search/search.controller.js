import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/apiResponse.js';
import { CONTENT_STATUS, QUESTION_STATUS } from '../../constants/statuses.js';
import { Article } from '../../models/Article.js';
import { Question } from '../../models/Question.js';
import { Course } from '../../models/Course.js';
import { Video } from '../../models/Video.js';

// Escapes user input so it can be used safely inside a RegExp.
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Runs a search over one model: try the $text index first, then fall back to a
// case-insensitive regex $or across the given fields (covers models/queries the
// text index can't serve). `baseFilter` scopes results (e.g. published only).
async function searchModel(model, term, fields, baseFilter, limit, sort) {
  const rx = new RegExp(escapeRegex(term), 'i');
  const regexFilter = { ...baseFilter, $or: fields.map((f) => ({ [f]: rx })) };
  try {
    const textFilter = { ...baseFilter, $text: { $search: term } };
    const items = await model.find(textFilter).sort(sort).limit(limit).lean();
    // If the text index yields nothing, retry with regex before giving up.
    if (items.length) return items;
    return model.find(regexFilter).sort(sort).limit(limit).lean();
  } catch {
    // No usable text index (or bad query) — regex fallback.
    return model.find(regexFilter).sort(sort).limit(limit).lean();
  }
}

// GET / — PUBLIC site search across published content. Empty query returns
// empty groups (so the UI can call it without special-casing blank input).
export const search = asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

  if (!query) {
    return ok(res, { query: '', articles: [], questions: [], courses: [], videos: [] });
  }

  const [articles, questions, courses, videos] = await Promise.all([
    searchModel(
      Article,
      query,
      ['title', 'excerpt', 'body'],
      { status: CONTENT_STATUS.PUBLISHED },
      limit,
      '-publishedAt',
    ),
    searchModel(
      Question,
      query,
      ['title', 'body'],
      { status: QUESTION_STATUS.PUBLISHED },
      limit,
      '-publishedAt',
    ),
    searchModel(
      Course,
      query,
      ['title', 'summary', 'body'],
      { status: CONTENT_STATUS.PUBLISHED },
      limit,
      '-publishedAt',
    ),
    searchModel(
      Video,
      query,
      ['title', 'description'],
      { status: CONTENT_STATUS.PUBLISHED },
      limit,
      '-publishedAt',
    ),
  ]);

  return ok(res, {
    query,
    articles: articles.map((a) => ({
      id: a._id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      topic: a.topic || '',
      date: a.publishedAt || a.createdAt,
    })),
    questions: questions.map((q) => ({
      id: q._id,
      slug: q.slug,
      title: q.title,
      snippet: (q.body || '').slice(0, 200),
      category: q.category,
      date: q.publishedAt || q.createdAt,
    })),
    courses: courses.map((c) => ({
      id: c._id,
      slug: c.slug,
      title: c.title,
      excerpt: c.summary || '',
      date: c.publishedAt || c.createdAt,
    })),
    videos: videos.map((v) => ({
      id: v._id,
      slug: v.slug,
      title: v.title,
      excerpt: v.description || '',
      date: v.publishedAt || v.createdAt,
    })),
  });
});
