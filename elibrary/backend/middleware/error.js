import { config } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ message: `Route nahi mila: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Server par kuch ghalat ho gaya.';

  if (err.name === 'CastError') {
    status = 400;
    message = 'Ghalat ID format.';
  }
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `Ye ${field} pehle se mojood hai.`;
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

/** async controllers ko try/catch se bachane ke liye wrapper. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
