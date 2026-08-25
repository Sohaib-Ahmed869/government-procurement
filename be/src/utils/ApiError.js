// A typed error carrying an HTTP status code (and optional field errors) so the
// central error handler can turn any thrown error into a clean JSON response.
export class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', errors) {
    return new ApiError(400, msg, errors);
  }
  static unauthorized(msg = 'Not authenticated') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Not authorised') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Not found') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }
  static tooManyRequests(msg = 'Too many requests') {
    return new ApiError(429, msg);
  }
  // For a dependency that is absent or unconfigured rather than broken — the
  // caller should try later or an operator should fix the configuration, and
  // neither is the 500 that "something threw" means.
  static unavailable(msg = 'Temporarily unavailable') {
    return new ApiError(503, msg);
  }
}
