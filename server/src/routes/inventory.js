import express from 'express';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { adjustStock, receiveStock } from '../services/stockService.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';

export const inventoryRouter = express.Router();

const adjustStockSchema = z.object({
  productId: z.string(),
  newOnHand: z.number().int().min(0),
  reason: z.enum([
    'manual_adjustment',
    'count_correction',
    'damaged',
    'expired',
    'return_restock',
    'return_damaged'
  ]),
  notes: z.string().min(2)
});

const receiveStockSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  referenceId: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

inventoryRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { lowStockOnly, search } = req.query;
    const filter = { status: 'active' };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { sku: regex }];
    }

    const products = await Product.find(filter).sort({ name: 1 });

    let result = products.map((p) => ({
      id: p._id,
      name: p.name,
      sku: p.sku,
      categoryName: p.categoryName,
      unit: p.unit,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      onHand: p.onHand,
      reserved: p.reserved,
      available: p.available,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock
    }));

    if (lowStockOnly === 'true') {
      result = result.filter((p) => p.isLowStock);
    }

    res.json({ inventory: result });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post('/adjust', requireAuth, requireRole('owner', 'manager', 'inventory'), validateBody(adjustStockSchema), async (req, res, next) => {
  try {
    const { productId, newOnHand, reason, notes } = req.body;
    const product = await adjustStock({
      productId,
      newOnHand,
      reason,
      notes,
      actor: req.user
    });

    await logAudit({
      req,
      action: 'inventory.adjusted',
      entityType: 'Product',
      entityId: product._id,
      after: { newOnHand, reason, notes }
    });

    res.json({
      message: 'Stock adjusted successfully',
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        onHand: product.onHand,
        reserved: product.reserved,
        available: product.available
      }
    });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post('/receive', requireAuth, requireRole('owner', 'manager', 'inventory'), validateBody(receiveStockSchema), async (req, res, next) => {
  try {
    const { productId, quantity, referenceId, notes } = req.body;
    const product = await receiveStock({
      productId,
      quantity,
      referenceType: 'manual',
      referenceId,
      notes,
      actor: req.user
    });

    await logAudit({
      req,
      action: 'inventory.received',
      entityType: 'Product',
      entityId: product._id,
      after: { quantityReceived: quantity, newOnHand: product.onHand, notes }
    });

    res.json({
      message: 'Stock received successfully',
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        onHand: product.onHand,
        reserved: product.reserved,
        available: product.available
      }
    });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get('/movements', requireAuth, async (req, res, next) => {
  try {
    const { productId, reason, limit = 50 } = req.query;
    const filter = {};
    if (productId) filter.productId = productId;
    if (reason) filter.reason = reason;

    const movements = await StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ movements });
  } catch (err) {
    next(err);
  }
});
