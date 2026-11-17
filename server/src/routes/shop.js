import express from 'express';
import { z } from 'zod';
import { Shop } from '../models/Shop.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';

export const shopRouter = express.Router();

const shopUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional()
    })
    .optional(),
  businessHours: z
    .object({
      open: z.string().optional(),
      close: z.string().optional(),
      isOpen: z.boolean().optional()
    })
    .optional(),
  deliveryZones: z
    .array(
      z.object({
        name: z.string(),
        fee: z.number().min(0),
        estimatedTime: z.string().optional(),
        active: z.boolean().optional()
      })
    )
    .optional(),
  mpesaConfig: z
    .object({
      enabled: z.boolean().optional(),
      environment: z.enum(['sandbox', 'production']).optional(),
      shortcode: z.string().optional(),
      passkey: z.string().optional(),
      consumerKey: z.string().optional(),
      consumerSecret: z.string().optional(),
      callbackUrl: z.string().optional()
    })
    .optional()
});

shopRouter.get('/', async (_req, res, next) => {
  try {
    let shop = await Shop.findOne();
    if (!shop) {
      shop = await Shop.create({});
    }
    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

shopRouter.put('/', requireAuth, requireRole('owner', 'manager'), validateBody(shopUpdateSchema), async (req, res, next) => {
  try {
    let shop = await Shop.findOne();
    if (!shop) {
      shop = new Shop();
    }

    const before = shop.toObject();
    Object.assign(shop, req.body);
    await shop.save();

    await logAudit({
      req,
      action: 'shop.update_settings',
      entityType: 'Shop',
      entityId: shop._id,
      before,
      after: shop.toObject()
    });

    res.json({ shop });
  } catch (err) {
    next(err);
  }
});
