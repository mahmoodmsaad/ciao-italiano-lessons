import { config } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong on the server.';

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format.';
  }
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `This ${field} already exists.`;
  }
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0]?.message || message;
  }

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    message,
    ...(config.nodeEnv === 'development' && status >= 500 ? { stack: err.stack } : {}),
  });
}

/** Wraps async controllers so they do not each need their own try/catch. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
