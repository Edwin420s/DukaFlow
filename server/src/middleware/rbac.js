import { AppError } from '../shared/errors.js';

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (req.user.role === 'owner') {
      return next(); // Owner has full authorization
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Action requires one of the following roles: ${allowedRoles.join(', ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

export function requirePermission(permission) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (req.user.role === 'owner') {
      return next(); // Owner has all permissions
    }

    const userPerms = req.user.permissions || [];
    if (userPerms.includes('*') || userPerms.includes(permission)) {
      return next();
    }

    return next(new AppError(`Missing required permission: ${permission}`, 403, 'PERMISSION_DENIED'));
  };
}
