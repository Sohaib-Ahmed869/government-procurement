import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created } from '../../utils/apiResponse.js';
import { User } from '../../models/User.js';
import { InstructorProfile } from '../../models/InstructorProfile.js';
import { ROLES, SELF_SIGNUP_ROLES, STAFF_ROLES } from '../../constants/roles.js';
import { signAuthToken } from '../../utils/token.js';

// Where each role belongs after signing in. Returned with the session so one
// sign-in page can send people to the right app without the client hardcoding
// a role→route table that then drifts from this one.
export function homeFor(role) {
  if (STAFF_ROLES.includes(role)) return '/admin';
  if (role === ROLES.INSTRUCTOR) return '/learn/instructor';
  return '/learn';
}

// POST /accounts/signup. PUBLIC self-registration for the LMS.
//
// Deliberately separate from POST /auth/register, which is admin-only staff
// provisioning and must stay that way. The two differ in one critical respect:
// this one is unauthenticated, so it can never be allowed to mint a staff
// account. `role` is validated against SELF_SIGNUP_ROLES rather than trusted.
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role, organisation, headline } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    throw ApiError.badRequest('Name, email and password are required');
  }
  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  // The whole security of this endpoint is this check. Without it, anyone can
  // POST role:"superadmin" and own the CMS.
  const requested = role ?? ROLES.STUDENT;
  if (!SELF_SIGNUP_ROLES.includes(requested)) {
    throw ApiError.forbidden('That account type cannot be created here');
  }

  const normalisedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalisedEmail });
  if (existing) {
    // A generic message would be friendlier to account enumeration, but signup
    // has to tell you the address is taken or you cannot proceed. The password
    // reset flow is the one that stays deliberately vague.
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalisedEmail,
    password,
    role: requested,
  });

  if (requested === ROLES.INSTRUCTOR) {
    await InstructorProfile.create({
      user: user._id,
      organisation: organisation ?? '',
      headline: headline ?? '',
    });
  }

  // Signed in immediately. Making someone sign in again right after signing up
  // is a step that exists only to annoy them.
  const token = signAuthToken({ sub: user._id, role: user.role });

  return created(res, {
    user: user.toSafeJSON(),
    token,
    home: homeFor(user.role),
  });
});

// GET /accounts/me. The signed-in user plus their LMS-side extras, so the
// client can render the right shell in one request instead of two.
export const meWithProfile = asyncHandler(async (req, res) => {
  const payload = {
    user: req.user.toSafeJSON(),
    home: homeFor(req.user.role),
    instructor: null,
  };

  if (req.user.role === ROLES.INSTRUCTOR) {
    const profile = await InstructorProfile.findOne({ user: req.user._id });
    if (profile) {
      payload.instructor = {
        id: profile._id,
        headline: profile.headline,
        bio: profile.bio,
        organisation: profile.organisation,
        status: profile.status,
      };
    }
  }

  return ok(res, payload);
});

// PATCH /accounts/instructor-profile. An instructor edits their own details.
// `status` is intentionally not writable here: an instructor approving
// themselves would defeat the point of the gate.
export const updateInstructorProfile = asyncHandler(async (req, res) => {
  const { headline, bio, organisation, avatarUrl } = req.body;

  const profile = await InstructorProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Instructor profile not found');

  if (headline !== undefined) profile.headline = headline;
  if (bio !== undefined) profile.bio = bio;
  if (organisation !== undefined) profile.organisation = organisation;
  if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl;
  await profile.save();

  return ok(res, {
    id: profile._id,
    headline: profile.headline,
    bio: profile.bio,
    organisation: profile.organisation,
    status: profile.status,
  });
});
