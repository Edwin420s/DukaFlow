import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { createNotification } from './notificationService.js';
import { AppError } from '../shared/errors.js';

export async function reserveStock(productId, quantity) {
  if (quantity <= 0) {
    throw new AppError('Reservation quantity must be positive', 400, 'INVALID_QUANTITY');
  }

  // Atomically find product where available (onHand - reserved) >= quantity
  const product = await Product.findOneAndUpdate(
    {
      _id: productId,
      status: 'active',
      $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, quantity] }
    },
    { $inc: { reserved: quantity } },
    { new: true }
  );

  if (!product) {
    const existing = await Product.findById(productId);
    if (!existing || existing.status !== 'active') {
      throw new AppError('Product not available for purchase', 400, 'PRODUCT_UNAVAILABLE');
    }
    const avail = Math.max(0, existing.onHand - existing.reserved);
    throw new AppError(
      `Insufficient stock for ${existing.name}. Available: ${avail}, requested: ${quantity}`,
      400,
      'INSUFFICIENT_STOCK'
    );
  }

  return product;
}

export async function releaseStockReservation(productId, quantity) {
  if (quantity <= 0) return;
  return Product.findByIdAndUpdate(
    productId,
    { $inc: { reserved: -quantity } },
    { new: true }
  );
}

export async function commitStockReservation({ productId, quantity, orderNumber, actor = null }) {
  if (quantity <= 0) return;

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found for stock commit', 404, 'NOT_FOUND');

  const previousOnHand = product.onHand;
  const newOnHand = Math.max(0, product.onHand - quantity);

  product.onHand = newOnHand;
  product.reserved = Math.max(0, product.reserved - quantity);
  await product.save();

  // Immutable stock movement
  await StockMovement.create({
    productId: product._id,
    productName: product.name,
    sku: product.sku,
    change: -quantity,
    previousOnHand,
    newOnHand,
    reason: 'order_sale',
    referenceType: 'order',
    referenceId: orderNumber,
    notes: `Committed sale for order ${orderNumber}`,
    actorId: actor?._id,
    actorName: actor?.name || 'Customer Checkout'
  });

  // Low stock check
  if (product.available <= product.lowStockThreshold) {
    await createNotification({
      title: 'Low Stock Alert',
      message: `${product.name} (${product.sku}) has only ${product.available} units remaining.`,
      type: 'inventory',
      severity: 'warning',
      link: `/inventory`
    });
  }

  return product;
}

export async function adjustStock({ productId, newOnHand, reason, notes = '', actor = null }) {
  if (newOnHand < 0) {
    throw new AppError('On-hand quantity cannot be negative', 400, 'INVALID_QUANTITY');
  }

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const previousOnHand = product.onHand;
  const change = newOnHand - previousOnHand;

  if (change === 0) return product;

  product.onHand = newOnHand;
  await product.save();

  await StockMovement.create({
    productId: product._id,
    productName: product.name,
    sku: product.sku,
    change,
    previousOnHand,
    newOnHand,
    reason,
    referenceType: 'manual',
    notes,
    actorId: actor?._id,
    actorName: actor?.name || 'Staff'
  });

  if (product.available <= product.lowStockThreshold) {
    await createNotification({
      title: 'Low Stock Alert',
      message: `${product.name} (${product.sku}) has only ${product.available} units remaining after adjustment.`,
      type: 'inventory',
      severity: 'warning',
      link: `/inventory`
    });
  }

  return product;
}

export async function receiveStock({ productId, quantity, referenceType = 'purchase_order', referenceId = '', notes = '', actor = null }) {
  if (quantity <= 0) {
    throw new AppError('Received quantity must be positive', 400, 'INVALID_QUANTITY');
  }

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const previousOnHand = product.onHand;
  const newOnHand = previousOnHand + quantity;

  product.onHand = newOnHand;
  await product.save();

  await StockMovement.create({
    productId: product._id,
    productName: product.name,
    sku: product.sku,
    change: quantity,
    previousOnHand,
    newOnHand,
    reason: 'purchase_receive',
    referenceType,
    referenceId,
    notes,
    actorId: actor?._id,
    actorName: actor?.name || 'Staff'
  });

  return product;
}
