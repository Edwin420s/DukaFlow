import express from 'express';
import { z } from 'zod';
import { Return } from '../models/Return.js';
import { createReturnRequest, processReturnInspection } from '../services/returnService.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../shared/errors.js';

export const returnsRouter = express.Router();

const createReturnSchema = z.object({
  orderId: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        reason: z.enum(['defective', 'damaged_in_transit', 'wrong_item', 'customer_request', 'expired'])
      })
    )
    .min(1),
  notes: z.string().optional().default('')
});

const inspectReturnSchema = z.object({
  itemDispositions: z
    .array(
      z.object({
        itemId: z.string(),
        disposition: z.enum(['restock', 'damaged_writeoff', 'supplier_return']),
        dispositionNotes: z.string().optional().default('')
      })
    )
    .min(1),
  issueRefund: z.boolean().optional().default(false),
  notes: z.string().optional().default('')
});

returnsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const returns = await Return.find().sort({ createdAt: -1 });
    res.json({ returns });
  } catch (err) {
    next(err);
  }
});

returnsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const ret = await Return.findById(req.params.id);
    if (!ret) throw new AppError('Return record not found', 404, 'NOT_FOUND');
    res.json({ return: ret });
  } catch (err) {
    next(err);
  }
});

returnsRouter.post('/', requireAuth, requireRole('owner', 'manager', 'cashier'), validateBody(createReturnSchema), async (req, res, next) => {
  try {
    const ret = await createReturnRequest({
      orderId: req.body.orderId,
      items: req.body.items,
      notes: req.body.notes,
      actor: req.user,
      req
    });
    res.status(201).json({ return: ret });
  } catch (err) {
    next(err);
  }
});

returnsRouter.post('/:id/inspect', requireAuth, requireRole('owner', 'manager'), validateBody(inspectReturnSchema), async (req, res, next) => {
  try {
    const ret = await processReturnInspection({
      returnId: req.params.id,
      itemDispositions: req.body.itemDispositions,
      issueRefund: req.body.issueRefund,
      notes: req.body.notes,
      actor: req.user,
      req
    });
    res.json({ return: ret, message: 'Return inspected and processed successfully' });
  } catch (err) {
    next(err);
  }
});
