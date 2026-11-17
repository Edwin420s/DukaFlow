import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { Shop } from '../models/Shop.js';
import { AppError } from '../shared/errors.js';

export async function calculateAuthoritativeTotals({
  items, // array of { productId, quantity }
  couponCode = '',
  fulfilmentType = 'pickup',
  deliveryZoneName = ''
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400, 'EMPTY_CART');
  }

  const shop = (await Shop.findOne()) || {
    taxRate: 16,
    deliveryZones: []
  };

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  let subtotal = 0;
  let taxableSubtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity));
    if (!qty || qty <= 0) {
      throw new AppError(`Invalid quantity for item ${item.productId}`, 400, 'INVALID_QUANTITY');
    }

    const product = productMap.get(String(item.productId));
    if (!product) {
      throw new AppError(`Product ${item.productId} was not found`, 404, 'PRODUCT_NOT_FOUND');
    }

    if (product.status !== 'active') {
      throw new AppError(`Product "${product.name}" is no longer available`, 400, 'PRODUCT_INACTIVE');
    }

    const available = Math.max(0, product.onHand - product.reserved);
    if (available < qty) {
      throw new AppError(
        `Insufficient stock for "${product.name}". Only ${available} available.`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    const unitPrice = product.sellingPrice; // Authoritative price from database
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    if (product.taxCategory === 'standard') {
      taxableSubtotal += lineTotal;
    }

    verifiedItems.push({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      imageUrl: product.imageUrl,
      unitPrice,
      costPrice: product.costPrice,
      quantity: qty,
      total: lineTotal
    });
  }

  // Calculate discount
  let discountTotal = 0;
  let appliedCoupon = null;

  if (couponCode && couponCode.trim()) {
    const code = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon) {
      throw new AppError(`Coupon code "${code}" is invalid or inactive`, 400, 'INVALID_COUPON');
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new AppError(`Coupon "${code}" is not active yet`, 400, 'COUPON_NOT_STARTED');
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new AppError(`Coupon "${code}" has expired`, 400, 'COUPON_EXPIRED');
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new AppError(`Coupon "${code}" usage limit reached`, 400, 'COUPON_LIMIT_REACHED');
    }
    if (subtotal < coupon.minOrderValue) {
      const minKes = (coupon.minOrderValue / 100).toFixed(2);
      throw new AppError(
        `Order subtotal must be at least KES ${minKes} to use coupon "${code}"`,
        400,
        'COUPON_MIN_ORDER_NOT_MET'
      );
    }

    if (coupon.discountType === 'percentage') {
      discountTotal = Math.round(subtotal * (coupon.discountValue / 100));
      if (coupon.maxDiscount && discountTotal > coupon.maxDiscount) {
        discountTotal = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'fixed') {
      discountTotal = Math.min(subtotal, coupon.discountValue);
    }

    appliedCoupon = coupon;
  }

  // Calculate delivery fee
  let deliveryFee = 0;
  if (fulfilmentType === 'delivery') {
    const zone = shop.deliveryZones?.find((z) => z.active && z.name === deliveryZoneName);
    if (zone) {
      deliveryFee = zone.fee;
    } else if (shop.deliveryZones && shop.deliveryZones.length > 0) {
      // Default to first active zone if not exact match
      const fallbackZone = shop.deliveryZones.find((z) => z.active);
      deliveryFee = fallbackZone ? fallbackZone.fee : 20000; // 200 KES default
    } else {
      deliveryFee = 20000; // 200 KES default delivery
    }
  }

  // Tax calculation (16% VAT on taxable portion after proportional discount)
  const effectiveTaxable = Math.max(0, taxableSubtotal - (subtotal > 0 ? (taxableSubtotal / subtotal) * discountTotal : 0));
  const taxRate = shop.taxRate || 16;
  const taxTotal = Math.round(effectiveTaxable * (taxRate / 100));

  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal + deliveryFee);

  return {
    items: verifiedItems,
    subtotal,
    discountTotal,
    couponCode: appliedCoupon ? appliedCoupon.code : '',
    taxTotal,
    deliveryFee,
    grandTotal,
    appliedCoupon
  };
}
