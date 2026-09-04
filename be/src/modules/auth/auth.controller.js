import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { recordAudit } from '../../models/AuditLog.js';
import { User } from '../../models/User.js';
import { signAuthToken, signResetToken, verifyResetToken } from '../../utils/token.js';
import { sendMailSafe } from '../../utils/mailer.js';
import { env } from '../../config/env.js';

// POST /register — admin creates a staff user. Guarded in the routes file.
export const register = asyncHandler(async (req, res) => {
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
    summary: `Registered staff user ${user.email}`,
  });
  return created(res, user.toSafeJSON());
});

// POST /login — public. Exchanges credentials for a signed auth token.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // password + active are select:false on the model, so opt them in explicitly.
  const user = await User.findOne({ email }).select('+password +active');
  if (!user || !user.active) throw ApiError.unauthorized('Invalid email or password');

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('Invalid email or password');

  user.lastLoginAt = new Date();
  await user.save();

  const token = signAuthToken({ sub: user._id, role: user.role });
  return ok(res, { user: user.toSafeJSON(), token });
});

// GET /me — the currently authenticated user.
export const me = asyncHandler(async (req, res) => ok(res, req.user.toSafeJSON()));

// PATCH /me — update own name and/or password.
const PROFILE_FIELDS = ['title', 'organisation', 'location', 'bio', 'website'];

export const updateMe = asyncHandler(async (req, res) => {
  const { name, password, profile, settings } = req.body;
  if (name !== undefined) req.user.name = name;
  // Assigning triggers the model's pre-save hook, which re-hashes the password.
  if (password) req.user.password = password;

  // Field by field off a whitelist, not a wholesale assign: `profile` arrives
  // from the browser, and a spread would let it carry keys the schema does not
  // have — or, on a document, ones it does.
  if (profile && typeof profile === 'object') {
    PROFILE_FIELDS.forEach((field) => {
      if (profile[field] !== undefined) req.user.profile[field] = String(profile[field]);
    });
  }

  // Settings are booleans and nothing else. The keys are the client's to choose
  // (see the note on the model) but the values are not: anything truthy is
  // stored as `true` rather than as whatever arrived.
  if (settings && typeof settings === 'object') {
    Object.entries(settings).forEach(([key, value]) => {
      if (typeof key === 'string' && key.length <= 64) req.user.settings.set(key, Boolean(value));
    });
  }

  await req.user.save();
  return ok(res, req.user.toSafeJSON());
});

// POST /forgot-password — public. Always responds success so we never leak
// whether an account exists for the given email.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const successBody = {
    message: 'If an account exists for that email, a reset link has been sent.',
  };

  if (!email) return ok(res, successBody);

  const user = await User.findOne({ email });
  if (user) {
    const token = signResetToken({ sub: user._id });
    // Use the first configured client origin, falling back to a relative path.
    const base = env.clientOrigins[0] || '';
    const link = `${base}/admin/reset-password?token=${encodeURIComponent(token)}`;
    /* sendMailSafe, NOT sendMail, and this is a security property rather than
       tidiness. This endpoint answers identically whether or not the account
       exists, on purpose. A throwing send would break that: a missing address
       returns 200 (nothing is sent) while a real one returns 500 (the send
       failed) — which tells an attacker exactly which addresses are registered.
       It must fail the same way for everyone. */
    await sendMailSafe({
      to: user.email,
      subject: 'Reset your password',
      text: `Reset your password using this link: ${link}`,
      html: `<p>Reset your password using this link:</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  return ok(res, successBody);
});

// POST /reset-password — public. Consumes a reset token and sets a new password.
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  let decoded;
  try {
    decoded = verifyResetToken(token);
  } catch {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  const user = await User.findById(decoded.sub);
  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');

  user.password = password; // pre-save hook re-hashes.
  await user.save();

  return ok(res, { message: 'Your password has been reset.' });
});
