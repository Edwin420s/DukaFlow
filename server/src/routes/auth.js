import express from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';
import { AppError } from '../shared/errors.js';

export const authRouter = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  password: z.string().min(6),
  role: z.enum(['owner', 'manager', 'cashier', 'inventory', 'fulfilment', 'customer']).optional().default('customer')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role,
      status: 'active'
    });

    const accessToken = await generateAccessToken(user);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    await logAudit({
      req,
      action: 'user.registered',
      entityType: 'User',
      entityId: user._id,
      after: { email, role }
    });

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions
      },
      accessToken
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'active') {
      throw new AppError('Account is inactive or suspended', 403, 'ACCOUNT_INACTIVE');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = await generateAccessToken(user);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    await logAudit({
      req,
      action: 'user.login',
      entityType: 'User',
      entityId: user._id,
      actor: user
    });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions
      },
      accessToken
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Successfully logged out' });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      permissions: req.user.permissions,
      lastLoginAt: req.user.lastLoginAt
    }
  });
});
