import express from 'express';
import { z } from 'zod';
import { calculateAuthoritativeTotals } from '../services/pricingService.js';
import { validateBody } from '../middleware/validate.js';

export const cartRouter = express.Router();

const cartCalculateSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive()
    })
  ).min(1),
  couponCode: z.string().optional().default(''),
  fulfilmentType: z.enum(['pickup', 'delivery']).optional().default('pickup'),
  deliveryZoneName: z.string().optional().default('')
});

cartRouter.post('/calculate', validateBody(cartCalculateSchema), async (req, res, next) => {
  try {
    const totals = await calculateAuthoritativeTotals(req.body);
    res.json(totals);
  } catch (err) {
    next(err);
  }
});
