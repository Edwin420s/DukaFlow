import { verifyAccessToken } from '../services/authService.js';
import { User } from '../models/User.js';
import { AppError } from '../shared/errors.js';

export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const payload = await verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user || user.status !== 'active') {
      return next(new AppError('User not found or account is deactivated', 401, 'USER_INACTIVE'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Invalid or expired authentication token', 401, 'INVALID_TOKEN', err.message));
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const payload = await verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('-passwordHash');
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    next();
  } catch {
    // Optional auth ignores token failures
    next();
  }
}
