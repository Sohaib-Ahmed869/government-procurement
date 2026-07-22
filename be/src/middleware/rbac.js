import { ApiError } from '../utils/ApiError.js';

// Guards a route to one or more roles. Use after `protect`. Accepts either
// spread roles or a role array (or a mix), so both of these work:
//   authorize(ROLES.SUPERADMIN, ROLES.EDITOR)
//   authorize(CONTENT_ROLES)            // CONTENT_ROLES is an array
export const authorize = (...roles) => {
  const allowed = roles.flat(Infinity);
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (allowed.length && !allowed.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
};
