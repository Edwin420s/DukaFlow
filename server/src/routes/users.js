import express from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { hashPassword } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';
import { AppError } from '../shared/errors.js';

export const usersRouter = express.Router();

const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  password: z.string().min(6),
  role: z.enum(['manager', 'cashier', 'inventory', 'fulfilment']),
  permissions: z.array(z.string()).optional().default([])
});

const updateStaffSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(['manager', 'cashier', 'inventory', 'fulfilment']).optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(['active', 'suspended', 'inactive']).optional()
});

usersRouter.get('/', requireAuth, requireRole('owner', 'manager'), async (_req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: 'customer' } })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/', requireAuth, requireRole('owner'), validateBody(createStaffSchema), async (req, res, next) => {
  try {
    const { name, email, phone, password, role, permissions } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('A user with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role,
      permissions,
      status: 'active'
    });

    await logAudit({
      req,
      action: 'staff.created',
      entityType: 'User',
      entityId: user._id,
      after: { email, role, permissions }
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.status(201).json({ user: userObj });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/:id', requireAuth, requireRole('owner'), validateBody(updateStaffSchema), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const before = user.toObject();
    Object.assign(user, req.body);
    await user.save();

    await logAudit({
      req,
      action: 'staff.updated',
      entityType: 'User',
      entityId: user._id,
      before,
      after: user.toObject()
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.json({ user: userObj });
  } catch (err) {
    next(err);
  }
});
