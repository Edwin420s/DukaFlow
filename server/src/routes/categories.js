import express from 'express';
import { z } from 'zod';
import { Category } from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';
import { AppError } from '../shared/errors.js';

export const categoriesRouter = express.Router();

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().default(''),
  icon: z.string().optional().default('Package'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().optional().default(0)
});

categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.post('/', requireAuth, requireRole('owner', 'manager'), validateBody(categorySchema), async (req, res, next) => {
  try {
    const existing = await Category.findOne({ slug: req.body.slug });
    if (existing) {
      throw new AppError('A category with this slug already exists', 409, 'SLUG_EXISTS');
    }

    const category = await Category.create(req.body);
    await logAudit({
      req,
      action: 'category.created',
      entityType: 'Category',
      entityId: category._id,
      after: category.toObject()
    });

    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.put('/:id', requireAuth, requireRole('owner', 'manager'), validateBody(categorySchema.partial()), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');

    const before = category.toObject();
    Object.assign(category, req.body);
    await category.save();

    await logAudit({
      req,
      action: 'category.updated',
      entityType: 'Category',
      entityId: category._id,
      before,
      after: category.toObject()
    });

    res.json({ category });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.delete('/:id', requireAuth, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');

    await logAudit({
      req,
      action: 'category.deleted',
      entityType: 'Category',
      entityId: category._id,
      before: category.toObject()
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});
