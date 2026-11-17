import express from 'express';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { StockMovement } from '../models/StockMovement.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';
import { AppError } from '../shared/errors.js';

export const productsRouter = express.Router();

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  sku: z.string().min(2).toUpperCase(),
  barcode: z.string().optional().default(''),
  description: z.string().optional().default(''),
  categoryId: z.string(),
  imageUrl: z.string().optional().default(''),
  unit: z.string().optional().default('piece'),
  costPrice: z.number().min(0), // KES cents
  sellingPrice: z.number().min(0), // KES cents
  taxCategory: z.enum(['standard', 'zero_rated', 'exempt']).optional().default('standard'),
  taxRate: z.number().min(0).max(100).optional().default(16),
  onHand: z.number().min(0).optional().default(0),
  lowStockThreshold: z.number().min(0).optional().default(5),
  status: z.enum(['active', 'archived', 'draft']).optional().default('active')
});

productsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, categoryId, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { sku: regex }, { barcode: regex }];
    }

    const products = await Product.find(filter).populate('categoryId', 'name slug').sort({ name: 1 });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name slug');
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/', requireAuth, requireRole('owner', 'manager', 'inventory'), validateBody(productSchema), async (req, res, next) => {
  try {
    const existing = await Product.findOne({ sku: req.body.sku });
    if (existing) {
      throw new AppError(`A product with SKU "${req.body.sku}" already exists`, 409, 'SKU_EXISTS');
    }

    const category = await Category.findById(req.body.categoryId);
    const categoryName = category ? category.name : '';

    const product = await Product.create({
      ...req.body,
      categoryName
    });

    // If initial stock > 0, record initial stock movement ledger entry
    if (product.onHand > 0) {
      await StockMovement.create({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        change: product.onHand,
        previousOnHand: 0,
        newOnHand: product.onHand,
        reason: 'count_correction',
        referenceType: 'manual',
        notes: 'Initial inventory on product creation',
        actorId: req.user._id,
        actorName: req.user.name
      });
    }

    await logAudit({
      req,
      action: 'product.created',
      entityType: 'Product',
      entityId: product._id,
      after: product.toObject()
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

productsRouter.put('/:id', requireAuth, requireRole('owner', 'manager', 'inventory'), validateBody(productSchema.partial()), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

    const before = product.toObject();

    // Prevent direct onHand modification here (must use inventory adjust/receive endpoints to preserve invariant audit trail)
    if (req.body.onHand !== undefined && req.body.onHand !== product.onHand) {
      delete req.body.onHand;
    }

    if (req.body.categoryId && req.body.categoryId !== String(product.categoryId)) {
      const cat = await Category.findById(req.body.categoryId);
      if (cat) req.body.categoryName = cat.name;
    }

    Object.assign(product, req.body);
    await product.save();

    await logAudit({
      req,
      action: 'product.updated',
      entityType: 'Product',
      entityId: product._id,
      before,
      after: product.toObject()
    });

    res.json({ product });
  } catch (err) {
    next(err);
  }
});

productsRouter.delete('/:id', requireAuth, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

    product.status = 'archived';
    await product.save();

    await logAudit({
      req,
      action: 'product.archived',
      entityType: 'Product',
      entityId: product._id
    });

    res.json({ message: 'Product archived successfully' });
  } catch (err) {
    next(err);
  }
});
