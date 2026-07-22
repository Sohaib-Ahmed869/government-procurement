import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/apiResponse.js';
import { parsePaging, paginate } from '../../utils/pagination.js';
import { recordAudit } from '../../models/AuditLog.js';
import { User } from '../../models/User.js';

// GET / — paginated staff list. Supports ?q (name/email regex) and ?role.
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);

  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(req.query.q.trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (req.query.role) filter.role = req.query.role;

  // password/active are select:false, so they are excluded from the list result.
  const { items, meta } = await paginate(User, filter, {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  });
  return ok(res, items.map((u) => u.toSafeJSON()), meta);
});

// POST / — create a staff user.
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    throw ApiError.badRequest('name, email and password are required');
  }

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const user = await User.create({ name, email, password, role });
  recordAudit({
    req,
    action: 'user.create',
    entity: 'User',
    entityId: user._id,
    summary: `Created user ${user.email}`,
  });
  return created(res, user.toSafeJSON());
});

// GET /:id — a single user.
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user.toSafeJSON());
});

// PATCH /:id — update name/email/role/active (and password if provided).
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+active');
  if (!user) throw ApiError.notFound('User not found');

  const { name, email, role, active, password } = req.body;
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = active;
  if (password) user.password = password; // pre-save hook re-hashes.

  await user.save();
  recordAudit({
    req,
    action: 'user.update',
    entity: 'User',
    entityId: user._id,
    summary: `Updated user ${user.email}`,
  });
  return ok(res, user.toSafeJSON());
});

// DELETE /:id — remove a user. Cannot delete yourself.
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.user._id.equals(id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) throw ApiError.notFound('User not found');

  recordAudit({
    req,
    action: 'user.delete',
    entity: 'User',
    entityId: user._id,
    summary: `Deleted user ${user.email}`,
  });
  return noContent(res);
});
