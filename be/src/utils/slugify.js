import slugifyLib from 'slugify';

export function toSlug(text) {
  return slugifyLib(String(text || ''), { lower: true, strict: true, trim: true });
}

// Ensures a slug is unique for the given model by appending -2, -3, ... if the
// base slug is already taken. `excludeId` lets an update keep its own slug.
export async function uniqueSlug(model, text, excludeId = null) {
  const base = toSlug(text) || 'item';
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await model.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}
