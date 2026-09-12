import { validationResult } from 'express-validator';

/** express-validator ke errors ko ek jaisa JSON response banata hai. */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    message: errors.array()[0].msg,
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}
