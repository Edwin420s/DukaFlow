import express from 'express';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { createOrder, transitionOrderStatus } from '../services/orderService.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../shared/errors.js';

export const ordersRouter = express.Router();

const createOrderSchema = z.object({
  customerType: z.enum(['guest', 'registered']).optional().default('guest'),
  customerName: z.string().min(2),
  customerEmail: z.string().email().or(z.literal('')).optional().default(''),
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

const transitionStatusSchema = z.object({
  status: z.enum([
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'dispatched',
    'completed',
    'cancelled',
    'rejected'
  ]),
  note: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

ordersRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, paymentStatus, search, limit = 50 } = req.query;
    const filter = {};

    // Strict account isolation: Customers only see their own orders
    if (req.user.role === 'customer') {
      filter.$and = [
        {
          $or: [
            { customerId: req.user._id },
            { customerEmail: req.user.email }
          ]
        }
      ];
    } else if (req.user.shopId) {
      filter.$or = [
        { shopId: req.user.shopId },
        { shopId: { $exists: false } }
      ];
    }

    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (search) {
      const regex = new RegExp(search, 'i');
      const searchConditions = [
        { orderNumber: regex },
        { customerName: regex },
        { customerPhone: regex }
      ];
      if (filter.$and) {
        filter.$and.push({ $or: searchConditions });
      } else {
        filter.$or = searchConditions;
      }
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    let order = null;
    if (req.params.id.startsWith('ORD-')) {
      order = await Order.findOne({ orderNumber: req.params.id }).populate('paymentId');
    } else {
      order = await Order.findById(req.params.id).populate('paymentId');
    }
    if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

    // Strict account isolation: Ensure customer can only view their own order
    if (req.user && req.user.role === 'customer') {
      const isOwner =
        (order.customerId && order.customerId.toString() === req.user._id.toString()) ||
        (order.customerEmail && order.customerEmail.toLowerCase() === req.user.email.toLowerCase());
      if (!isOwner) {
        throw new AppError('You do not have permission to view this order', 403, 'FORBIDDEN');
      }
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
});

ordersRouter.post('/', optionalAuth, validateBody(createOrderSchema), async (req, res, next) => {
  try {
    const order = await createOrder({
      ...req.body,
      customerId: req.user?._id || null,
      actor: req.user || null,
      req
    });
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

ordersRouter.patch('/:id/status', requireAuth, validateBody(transitionStatusSchema), async (req, res, next) => {
  try {
    const order = await transitionOrderStatus({
      orderId: req.params.id,
      newStatus: req.body.status,
      note: req.body.note || req.body.notes || '',
      actor: req.user,
      req
    });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

ordersRouter.post('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const order = await transitionOrderStatus({
      orderId: req.params.id,
      newStatus: 'cancelled',
      note: req.body.reason || 'Cancelled by staff',
      actor: req.user,
      req
    });
    res.json({ order, message: 'Order cancelled and stock reservations released.' });
  } catch (err) {
    next(err);
  }
});
