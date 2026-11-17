import express from 'express';
import { z } from 'zod';
import { Coupon } from '../models/Coupon.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';
import { AppError } from '../shared/errors.js';

export const couponsRouter = express.Router();

const couponSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  description: z.string().optional().default(''),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).optional().default(0),
  maxDiscount: z.number().positive().nullable().optional(),
  usageLimit: z.number().positive().nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional().default(true)
});

couponsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
});

couponsRouter.post('/', requireAuth, requireRole('owner', 'manager'), validateBody(couponSchema), async (req, res, next) => {
  try {
    const existing = await Coupon.findOne({ code: req.body.code });
    if (existing) throw new AppError('Coupon with this code already exists', 409, 'COUPON_EXISTS');

    const coupon = await Coupon.create(req.body);
    await logAudit({
      req,
      action: 'coupon.created',
      entityType: 'Coupon',
      entityId: coupon._id,
      after: coupon.toObject()
    });

    res.status(201).json({ coupon });
  } catch (err) {
    next(err);
  }
});

couponsRouter.put('/:id', requireAuth, requireRole('owner', 'manager'), validateBody(couponSchema.partial()), async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');

    const before = coupon.toObject();
    Object.assign(coupon, req.body);
    await coupon.save();

    await logAudit({
      req,
      action: 'coupon.updated',
      entityType: 'Coupon',
      entityId: coupon._id,
      before,
      after: coupon.toObject()
    });

    res.json({ coupon });
  } catch (err) {
    next(err);
  }
});

couponsRouter.delete('/:id', requireAuth, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND');

    await logAudit({
      req,
      action: 'coupon.deleted',
      entityType: 'Coupon',
      entityId: coupon._id,
      before: coupon.toObject()
    });

    res.json({ message: 'Coupon deleted successfully' });
  } catch (err) {
    next(err);
  }
});
