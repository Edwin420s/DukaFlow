import express from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../shared/errors.js';

export const customersRouter = express.Router();

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9),
  email: z.string().email().optional().default(''),
  address: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

customersRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const customers = await Customer.find(filter).sort({ totalSpend: -1 });
    res.json({ customers });
  } catch (err) {
    next(err);
  }
});

customersRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

    const orders = await Order.find({ customerPhone: customer.phone }).sort({ createdAt: -1 });
    res.json({ customer, orders });
  } catch (err) {
    next(err);
  }
});

customersRouter.post('/', requireAuth, validateBody(customerSchema), async (req, res, next) => {
  try {
    const existing = await Customer.findOne({ phone: req.body.phone });
    if (existing) {
      throw new AppError('Customer with this phone number already exists', 409, 'PHONE_EXISTS');
    }

    const customer = await Customer.create(req.body);
    res.status(201).json({ customer });
  } catch (err) {
    next(err);
  }
});
