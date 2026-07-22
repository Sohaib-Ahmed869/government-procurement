import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAuthToken } from '../utils/token.js';
import { User } from '../models/User.js';

// Requires a valid Bearer token. Loads the user onto req.user.
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Missing authentication token');

  let decoded;
  try {
    decoded = verifyAuthToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(decoded.sub).select('+active');
  if (!user || !user.active) throw ApiError.unauthorized('Account not found or disabled');

  req.user = user;
  next();
});

// Optional auth: attaches req.user if a valid token is present, but never blocks.
// Used by public content endpoints that expose extra fields to signed-in staff.
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const decoded = verifyAuthToken(token);
      const user = await User.findById(decoded.sub);
      if (user && user.active) req.user = user;
    } catch {
      /* ignore — treated as anonymous */
    }
  }
  next();
});
