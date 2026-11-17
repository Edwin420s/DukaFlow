import express from 'express';
import { z } from 'zod';
import { Supplier } from '../models/Supplier.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';
import { AppError } from '../shared/errors.js';

export const suppliersRouter = express.Router();

const supplierSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().optional().default(''),
  email: z.string().email().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  taxPin: z.string().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  notes: z.string().optional().default('')
});

suppliersRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json({ suppliers });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.post('/', requireAuth, requireRole('owner', 'manager', 'inventory'), validateBody(supplierSchema), async (req, res, next) => {
  try {
    const supplier = await Supplier.create(req.body);
    await logAudit({
      req,
      action: 'supplier.created',
      entityType: 'Supplier',
      entityId: supplier._id,
      after: supplier.toObject()
    });
    res.status(201).json({ supplier });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.put('/:id', requireAuth, requireRole('owner', 'manager', 'inventory'), validateBody(supplierSchema.partial()), async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) throw new AppError('Supplier not found', 404, 'NOT_FOUND');

    const before = supplier.toObject();
    Object.assign(supplier, req.body);
    await supplier.save();

    await logAudit({
      req,
      action: 'supplier.updated',
      entityType: 'Supplier',
      entityId: supplier._id,
      before,
      after: supplier.toObject()
    });

    res.json({ supplier });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.delete('/:id', requireAuth, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) throw new AppError('Supplier not found', 404, 'NOT_FOUND');

    await logAudit({
      req,
      action: 'supplier.deleted',
      entityType: 'Supplier',
      entityId: supplier._id,
      before: supplier.toObject()
    });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    next(err);
  }
});
