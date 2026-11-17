import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { Shop } from '../models/Shop.js';
import { commitStockReservation } from './stockService.js';
import { createNotification } from './notificationService.js';
import { logAudit } from './auditService.js';
import { AppError } from '../shared/errors.js';
import { randomUUID } from 'node:crypto';

function generatePaymentNumber() {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${dateStr}-${rand}`;
}

export async function recordCashPayment({
  orderId,
  tenderedAmount,
  cashier = null,
  req = null
}) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  if (order.paymentStatus === 'paid') {
    throw new AppError('Order is already paid', 400, 'ALREADY_PAID');
  }

  const tendered = Number(tenderedAmount);
  if (tendered < order.grandTotal) {
    throw new AppError(
      `Tendered amount (KES ${(tendered / 100).toFixed(2)}) is less than total due (KES ${(order.grandTotal / 100).toFixed(2)})`,
      400,
      'INSUFFICIENT_FUNDS'
    );
  }

  const changeAmount = tendered - order.grandTotal;
  const paymentNumber = generatePaymentNumber();

  const payment = await Payment.create({
    paymentNumber,
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount: order.grandTotal,
    currency: 'KES',
    method: 'cash',
    status: 'paid',
    transactionReference: `CASH-${paymentNumber}`,
    cashDetails: {
      tenderedAmount: tendered,
      changeAmount,
      cashierId: cashier?._id,
      cashierName: cashier?.name || 'Cashier'
    }
  });

  order.paymentStatus = 'paid';
  order.paymentId = payment._id;
  if (order.orderStatus === 'pending') {
    order.orderStatus = 'confirmed';
  }
  order.timeline.push({
    status: 'Payment Received',
    note: `Cash payment recorded. Tendered: KES ${(tendered / 100).toFixed(2)}, Change: KES ${(changeAmount / 100).toFixed(2)}`,
    actor: cashier?.name || 'Cashier'
  });
  await order.save();

  // Commit stock for each item in the order
  for (const item of order.items) {
    await commitStockReservation({
      productId: item.productId,
      quantity: item.quantity,
      orderNumber: order.orderNumber,
      actor: cashier
    });
  }

  await logAudit({
    req,
    action: 'payment.cash_recorded',
    entityType: 'Payment',
    entityId: payment._id,
    after: { paymentNumber, amount: order.grandTotal, changeAmount },
    actor: cashier
  });

  await createNotification({
    title: 'Cash Payment Recorded',
    message: `Payment of KES ${(order.grandTotal / 100).toFixed(2)} received for ${order.orderNumber}.`,
    type: 'payment',
    severity: 'info',
    link: `/orders`
  });

  return { payment, changeAmount, order };
}

export async function processSimulatedPayment({
  orderId,
  simulateFailure = false,
  req = null
}) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  if (order.paymentStatus === 'paid') {
    throw new AppError('Order is already paid', 400, 'ALREADY_PAID');
  }

  const paymentNumber = generatePaymentNumber();

  if (simulateFailure) {
    const payment = await Payment.create({
      paymentNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.grandTotal,
      currency: 'KES',
      method: 'simulated',
      status: 'failed',
      transactionReference: `SIM-FAIL-${randomUUID().slice(0, 8)}`
    });
    order.paymentStatus = 'failed';
    order.paymentId = payment._id;
    order.timeline.push({
      status: 'Payment Failed',
      note: 'Simulated payment declined by provider.',
      actor: 'Payment Gateway'
    });
    await order.save();
    return { payment, order, success: false };
  }

  const payment = await Payment.create({
    paymentNumber,
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount: order.grandTotal,
    currency: 'KES',
    method: 'simulated',
    status: 'paid',
    transactionReference: `SIM-TXN-${randomUUID().slice(0, 8).toUpperCase()}`
  });

  order.paymentStatus = 'paid';
  order.paymentId = payment._id;
  if (order.orderStatus === 'pending') {
    order.orderStatus = 'confirmed';
  }
  order.timeline.push({
    status: 'Payment Received',
    note: `Online payment authorized. Ref: ${payment.transactionReference}`,
    actor: 'Payment Gateway'
  });
  await order.save();

  for (const item of order.items) {
    await commitStockReservation({
      productId: item.productId,
      quantity: item.quantity,
      orderNumber: order.orderNumber,
      actor: req?.user
    });
  }

  await logAudit({
    req,
    action: 'payment.simulated_success',
    entityType: 'Payment',
    entityId: payment._id,
    after: { paymentNumber, amount: order.grandTotal, ref: payment.transactionReference }
  });

  await createNotification({
    title: 'Payment Received',
    message: `Payment of KES ${(order.grandTotal / 100).toFixed(2)} confirmed for ${order.orderNumber}.`,
    type: 'payment',
    severity: 'info',
    link: `/orders`
  });

  return { payment, order, success: true };
}

export async function initiateMpesaStkPush({ orderId, phoneNumber, req = null }) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  if (order.paymentStatus === 'paid') {
    throw new AppError('Order is already paid', 400, 'ALREADY_PAID');
  }

  // Format phone to 2547XXXXXXXX or 2541XXXXXXXX
  let phone = phoneNumber.replace(/[\s+-]/g, '');
  if (phone.startsWith('0')) {
    phone = '254' + phone.slice(1);
  } else if (!phone.startsWith('254')) {
    phone = '254' + phone;
  }

  if (!/^254[17]\d{8}$/.test(phone)) {
    throw new AppError(
      'Invalid Kenyan phone number for M-Pesa. Format: 07XXXXXXXX or 01XXXXXXXX',
      400,
      'INVALID_PHONE'
    );
  }

  const shop = await Shop.findOne();
  const mpesaConfig = shop?.mpesaConfig || {};

  const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
  const merchantRequestId = `MR_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const paymentNumber = generatePaymentNumber();

  const payment = await Payment.create({
    paymentNumber,
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount: order.grandTotal,
    currency: 'KES',
    method: 'mpesa',
    status: 'pending',
    mpesaDetails: {
      checkoutRequestId,
      merchantRequestId,
      phoneNumber: phone
    }
  });

  order.paymentStatus = 'pending';
  order.paymentId = payment._id;
  order.timeline.push({
    status: 'M-Pesa Prompt Sent',
    note: `STK push sent to ${phone}. Awaiting user PIN.`,
    actor: 'M-Pesa Daraja'
  });
  await order.save();

  await logAudit({
    req,
    action: 'payment.mpesa_stk_initiated',
    entityType: 'Payment',
    entityId: payment._id,
    after: { checkoutRequestId, phone, amount: order.grandTotal }
  });

  return {
    success: true,
    checkoutRequestId,
    merchantRequestId,
    paymentId: payment._id,
    paymentNumber,
    phone,
    message: `M-Pesa STK push initiated to ${phone}. Enter PIN on your phone.`
  };
}

export async function handleMpesaCallback({ callbackBody }) {
  // Idempotency: Daraja sends StkCallback payload
  const stkCallback = callbackBody?.Body?.stkCallback || callbackBody?.stkCallback || callbackBody;
  if (!stkCallback) {
    throw new AppError('Invalid M-Pesa callback payload structure', 400, 'INVALID_CALLBACK');
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

  const payment = await Payment.findOne({ 'mpesaDetails.checkoutRequestId': CheckoutRequestID });
  if (!payment) {
    console.warn(`M-Pesa callback received for unknown CheckoutRequestID: ${CheckoutRequestID}`);
    return { acknowledged: true, note: 'Unknown CheckoutRequestID' };
  }

  // Idempotency check: if already settled, do not reprocess!
  if (payment.status === 'paid') {
    return { acknowledged: true, note: 'Duplicate callback ignored; payment already confirmed.' };
  }

  payment.mpesaDetails.resultCode = ResultCode;
  payment.mpesaDetails.resultDesc = ResultDesc;
  payment.mpesaDetails.callbackPayload = callbackBody;

  const order = await Order.findById(payment.orderId);

  if (ResultCode === 0) {
    // Payment Successful
    let mpesaReceipt = `MP${Date.now().toString().slice(-8)}`;
    if (CallbackMetadata?.Item) {
      const receiptItem = CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
      if (receiptItem?.Value) mpesaReceipt = String(receiptItem.Value);
    }

    payment.status = 'paid';
    payment.transactionReference = mpesaReceipt;
    payment.mpesaDetails.mpesaReceiptNumber = mpesaReceipt;
    await payment.save();

    if (order) {
      order.paymentStatus = 'paid';
      if (order.orderStatus === 'pending') {
        order.orderStatus = 'confirmed';
      }
      order.timeline.push({
        status: 'M-Pesa Payment Confirmed',
        note: `Receipt: ${mpesaReceipt}. Amount: KES ${(payment.amount / 100).toFixed(2)}`,
        actor: 'M-Pesa Daraja'
      });
      await order.save();

      // Commit stock reservations
      for (const item of order.items) {
        await commitStockReservation({
          productId: item.productId,
          quantity: item.quantity,
          orderNumber: order.orderNumber,
          actor: null
        });
      }

      await createNotification({
        title: 'M-Pesa Payment Confirmed',
        message: `M-Pesa Receipt ${mpesaReceipt} confirmed for ${order.orderNumber} (KES ${(payment.amount / 100).toFixed(2)}).`,
        type: 'payment',
        severity: 'info',
        link: `/orders`
      });
    }
  } else {
    // Payment Failed or Cancelled by user
    payment.status = 'failed';
    await payment.save();

    if (order) {
      order.paymentStatus = 'failed';
      order.timeline.push({
        status: 'M-Pesa Failed',
        note: ResultDesc || 'M-Pesa payment was cancelled or failed.',
        actor: 'M-Pesa Daraja'
      });
      await order.save();
    }
  }

  return { acknowledged: true, status: payment.status };
}

export async function processRefund({ paymentId, refundAmount, reason = '', actor = null, req = null }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');

  if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
    throw new AppError('Only settled payments can be refunded', 400, 'CANNOT_REFUND');
  }

  const amt = Number(refundAmount);
  if (amt <= 0) throw new AppError('Refund amount must be positive', 400, 'INVALID_AMOUNT');

  const maxRefundable = payment.amount - (payment.refundAmount || 0);
  if (amt > maxRefundable) {
    throw new AppError(
      `Refund amount (KES ${(amt / 100).toFixed(2)}) exceeds refundable balance (KES ${(maxRefundable / 100).toFixed(2)})`,
      400,
      'EXCEEDS_PAYMENT'
    );
  }

  payment.refundAmount = (payment.refundAmount || 0) + amt;
  payment.refundReason = reason;
  payment.refundedAt = new Date();
  payment.status = payment.refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
  await payment.save();

  const order = await Order.findById(payment.orderId);
  if (order) {
    order.paymentStatus = payment.status;
    order.timeline.push({
      status: `Refund ${payment.status === 'refunded' ? 'Issued' : 'Partial Issued'}`,
      note: `Refund of KES ${(amt / 100).toFixed(2)}. Reason: ${reason || 'Customer request'}`,
      actor: actor?.name || 'Staff'
    });
    await order.save();
  }

  await logAudit({
    req,
    action: 'payment.refund',
    entityType: 'Payment',
    entityId: payment._id,
    after: { refundAmount: amt, newStatus: payment.status, reason },
    actor
  });

  return { payment, order };
}
