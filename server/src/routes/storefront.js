import express from 'express';
import { z } from 'zod';
import { Shop } from '../models/Shop.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { calculateAuthoritativeTotals } from '../services/pricingService.js';
import { createOrder } from '../services/orderService.js';
import { validateBody } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { AppError } from '../shared/errors.js';

export const storefrontRouter = express.Router();

storefrontRouter.get('/shop', async (_req, res, next) => {
  try {
    let shop = await Shop.findOne();
    if (!shop) shop = await Shop.create({});

    // Expose only public shop details
    res.json({
      shop: {
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        phone: shop.phone,
        email: shop.email,
        address: shop.address,
        currency: shop.currency,
        currencySymbol: shop.currencySymbol,
        taxRate: shop.taxRate,
        businessHours: shop.businessHours,
        deliveryZones: shop.deliveryZones.filter((z) => z.active),
        mpesaEnabled: shop.mpesaConfig?.enabled || false
      }
    });
  } catch (err) {
    next(err);
  }
});

storefrontRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

storefrontRouter.get('/products', async (req, res, next) => {
  try {
    const { category, search, inStockOnly } = req.query;
    const filter = { status: 'active' };

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.categoryId = cat._id;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { description: regex }, { sku: regex }];
    }

    const products = await Product.find(filter).populate('categoryId', 'name slug').sort({ name: 1 });

    let sanitized = products.map((p) => {
      const avail = Math.max(0, p.onHand - p.reserved);
      return {
        id: p._id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        categoryName: p.categoryName,
        categorySlug: p.categoryId?.slug || '',
        imageUrl: p.imageUrl,
        unit: p.unit,
        sellingPrice: p.sellingPrice, // KES cents
        inStock: avail > 0,
        available: avail,
        isLowStock: avail > 0 && avail <= p.lowStockThreshold
      };
    });

    if (inStockOnly === 'true') {
      sanitized = sanitized.filter((p) => p.inStock);
    }

    res.json({ products: sanitized });
  } catch (err) {
    next(err);
  }
});

storefrontRouter.get('/products/:id', async (req, res, next) => {
  try {
    const p = await Product.findOne({ _id: req.params.id, status: 'active' }).populate('categoryId', 'name slug');
    if (!p) throw new AppError('Product not found', 404, 'NOT_FOUND');

    const avail = Math.max(0, p.onHand - p.reserved);
    res.json({
      product: {
        id: p._id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        categoryName: p.categoryName,
        imageUrl: p.imageUrl,
        unit: p.unit,
        sellingPrice: p.sellingPrice,
        inStock: avail > 0,
        available: avail,
        isLowStock: avail > 0 && avail <= p.lowStockThreshold
      }
    });
  } catch (err) {
    next(err);
  }
});

const calculateSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive()
      })
    )
    .min(1),
  couponCode: z.string().optional().default(''),
  fulfilmentType: z.enum(['pickup', 'delivery']).optional().default('pickup'),
  deliveryZoneName: z.string().optional().default('')
});

storefrontRouter.post('/calculate', validateBody(calculateSchema), async (req, res, next) => {
  try {
    const totals = await calculateAuthoritativeTotals(req.body);
    // Sanitize costPrice from returned item list
    const sanitizedItems = totals.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      imageUrl: i.imageUrl,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      total: i.total
    }));

    res.json({
      ...totals,
      items: sanitizedItems,
      appliedCoupon: totals.appliedCoupon ? { code: totals.appliedCoupon.code, discountType: totals.appliedCoupon.discountType } : null
    });
  } catch (err) {
    next(err);
  }
});

const checkoutSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email().optional().default(''),
  customerPhone: z.string().min(9),
  fulfilmentType: z.enum(['pickup', 'delivery']),
  deliveryAddress: z
    .object({
      street: z.string().optional().default(''),
      city: z.string().optional().default('Nairobi'),
      zone: z.string().optional().default(''),
      instructions: z.string().optional().default('')
    })
    .optional()
    .default({}),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive()
      })
    )
    .min(1),
  couponCode: z.string().optional().default(''),
  paymentMethod: z.enum(['cash', 'simulated', 'mpesa']),
  notes: z.string().optional().default('')
});

storefrontRouter.post('/orders', optionalAuth, validateBody(checkoutSchema), async (req, res, next) => {
  try {
    const order = await createOrder({
      ...req.body,
      customerType: req.user ? 'registered' : 'guest',
      customerId: req.user?._id || null,
      actor: req.user || null,
      req
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

storefrontRouter.get('/orders/:orderNumber', async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber.toUpperCase() }).populate('paymentId');
    if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

    // Return sanitized customer view (no internal cost prices)
    const sanitized = order.toObject();
    if (sanitized.items) {
      sanitized.items = sanitized.items.map((i) => {
        delete i.costPrice;
        return i;
      });
    }

    res.json({ order: sanitized });
  } catch (err) {
    next(err);
  }
});
