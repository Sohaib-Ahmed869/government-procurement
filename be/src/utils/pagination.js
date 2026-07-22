// Parses ?page & ?limit into skip/limit, clamped to sane bounds.
export function parsePaging(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// Builds the meta block returned alongside paginated lists.
export function pageMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

// Runs a paginated find on a Mongoose model and returns { items, meta }.
export async function paginate(model, filter, { page, limit, skip, sort = '-createdAt', populate } = {}) {
  let q = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (populate) q = q.populate(populate);
  const [items, total] = await Promise.all([q.exec(), model.countDocuments(filter)]);
  return { items, meta: pageMeta({ page, limit, total }) };
}
