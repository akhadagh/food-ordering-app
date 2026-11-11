/**
 * Typed application errors. Every error that reaches the client goes through
 * the global error handler, which renders only `code` and `message` - the
 * database error text never leaks (audit finding P2-07).
 */
export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}

export const badRequest = (message, details) => new AppError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'unauthorized', message);
export const forbidden = (message = 'Access denied') => new AppError(403, 'forbidden', message);
export const notFound = (message = 'Not found') => new AppError(404, 'not_found', message);
export const conflict = (message, details) => new AppError(409, 'conflict', message, details);
export const unprocessable = (message, details) =>
  new AppError(422, 'unprocessable', message, details);
export const tooManyRequests = (message = 'Too many requests') =>
  new AppError(429, 'too_many_requests', message);
export const paymentRequired = (message, details) =>
  new AppError(402, 'payment_required', message, details);
export const internal = (message = 'Something went wrong') =>
  new AppError(500, 'internal_error', message);

export default AppError;
