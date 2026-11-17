export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} was not found` } });
}

export function errorHandler(err, req, res, _next) {
  const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  if (status >= 500) console.error({ requestId: req.id, error: err });
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status >= 500 && process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
      ...(err.details ? { details: err.details } : {}),
      requestId: req.id
    }
  });
}
