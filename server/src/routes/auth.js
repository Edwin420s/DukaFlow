import express from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
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
  role: z.enum(['owner', 'manager', 'cashier', 'inventory', 'fulfilment', 'customer']).optional().default('customer'),
  shopName: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { name, email, phone, password, role, shopName } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    let shopId = null;
    if (role === 'owner' || shopName) {
      const sanitizedName = shopName?.trim() || `${name}'s Duka`;
      const slug = sanitizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;
      const newShop = await Shop.create({
        name: sanitizedName,
        slug,
        email: email,
        phone: phone || '+254 700 000 000'
      });
      shopId = newShop._id;
    } else {
      const defaultShop = await Shop.findOne();
      if (defaultShop) shopId = defaultShop._id;
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role,
      shopId,
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
      after: { email, role, shopId }
    });

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopId: user.shopId,
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
        shopId: user.shopId,
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
      shopId: req.user.shopId,
      permissions: req.user.permissions,
      createdAt: req.user.createdAt,
      lastLoginAt: req.user.lastLoginAt
    }
  });
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional()
});

authRouter.put('/profile', requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const { name, email, phone, currentPassword, newPassword } = req.body;

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    if (newPassword) {
      if (!currentPassword) {
        throw new AppError('Current password is required to set a new password', 400, 'PASSWORD_REQUIRED');
      }
      const isValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new AppError('Incorrect current password', 401, 'INVALID_PASSWORD');
      }
      user.passwordHash = await hashPassword(newPassword);
    }

    await user.save();

    await logAudit({
      req,
      action: 'user.profile_updated',
      entityType: 'User',
      entityId: user._id,
      actor: user,
      after: { name: user.name, email: user.email, phone: user.phone }
    });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopId: user.shopId,
        permissions: user.permissions,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      message: 'Profile updated successfully'
    });
  } catch (err) {
    next(err);
  }
});
