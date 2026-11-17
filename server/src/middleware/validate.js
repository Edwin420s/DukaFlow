import { AppError } from '../shared/errors.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError('Invalid request payload', 400, 'VALIDATION_ERROR', result.error.flatten().fieldErrors)
      );
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new AppError('Invalid query parameters', 400, 'VALIDATION_ERROR', result.error.flatten().fieldErrors)
      );
    }
    req.query = result.data;
    next();
  };
}
