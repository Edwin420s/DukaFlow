import express from 'express';
import { z } from 'zod';
import { Payment } from '../models/Payment.js';
import {
  recordCashPayment,
  processSimulatedPayment,
  initiateMpesaStkPush,
  handleMpesaCallback,
  processRefund
} from '../services/paymentService.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../shared/errors.js';

export const paymentsRouter = express.Router();

const cashPaymentSchema = z.object({
  orderId: z.string(),
  tenderedAmount: z.number().int().min(0) // KES cents
});

const simulatePaymentSchema = z.object({
  orderId: z.string(),
  simulateFailure: z.boolean().optional().default(false)
});

const stkPushSchema = z.object({
  orderId: z.string(),
  phoneNumber: z.string().min(9)
});

const refundSchema = z.object({
  paymentId: z.string(),
  refundAmount: z.number().int().positive(),
  reason: z.string().optional().default('')
});

paymentsRouter.post('/cash', requireAuth, requireRole('owner', 'manager', 'cashier'), validateBody(cashPaymentSchema), async (req, res, next) => {
  try {
    const result = await recordCashPayment({
      orderId: req.body.orderId,
      tenderedAmount: req.body.tenderedAmount,
      cashier: req.user,
      req
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/simulate', optionalAuth, validateBody(simulatePaymentSchema), async (req, res, next) => {
  try {
    const result = await processSimulatedPayment({
      orderId: req.body.orderId,
      simulateFailure: req.body.simulateFailure,
      req
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/mpesa/stkpush', optionalAuth, validateBody(stkPushSchema), async (req, res, next) => {
  try {
    const result = await initiateMpesaStkPush({
      orderId: req.body.orderId,
      phoneNumber: req.body.phoneNumber,
      req
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/mpesa/initiate', optionalAuth, validateBody(stkPushSchema), async (req, res, next) => {
  try {
    const result = await initiateMpesaStkPush({
      orderId: req.body.orderId,
      phoneNumber: req.body.phoneNumber,
      req
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Safaricom Daraja Webhook Callback (Public, server-to-server)
paymentsRouter.post('/mpesa/callback', async (req, res, next) => {
  try {
    const result = await handleMpesaCallback({ callbackBody: req.body });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Sandbox / Demo simulated M-Pesa approval (e.g. user entered PIN)
paymentsRouter.post('/mpesa/simulate-success', async (req, res, next) => {
  try {
    const { checkoutRequestId } = req.body;
    if (!checkoutRequestId) {
      throw new AppError('checkoutRequestId is required', 400, 'MISSING_PARAM');
    }

    const mockCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MR_MOCK',
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: `NL${Date.now().toString().slice(-8)}` },
              { Name: 'TransactionDate', Value: Date.now() },
              { Name: 'PhoneNumber', Value: 254712345678 }
            ]
          }
        }
      }
    };

    const result = await handleMpesaCallback({ callbackBody: mockCallback });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/refund', requireAuth, requireRole('owner', 'manager'), validateBody(refundSchema), async (req, res, next) => {
  try {
    const result = await processRefund({
      paymentId: req.body.paymentId,
      refundAmount: req.body.refundAmount,
      reason: req.body.reason,
      actor: req.user,
      req
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});
