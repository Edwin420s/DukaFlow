import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: true }
);

const timelineEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    actor: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, uppercase: true },
    customerType: { type: String, enum: ['guest', 'registered'], default: 'guest' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true, default: '' },
    customerPhone: { type: String, required: true, trim: true },
    fulfilmentType: { type: String, enum: ['pickup', 'delivery'], required: true },
    deliveryAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      zone: { type: String, default: '' },
      instructions: { type: String, default: '' }
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: '' },
    taxTotal: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'dispatched', 'completed', 'cancelled', 'rejected'],
      default: 'pending'
    },
    fulfilmentStatus: {
      type: String,
      enum: ['unfulfilled', 'packing', 'ready', 'dispatched', 'collected', 'delivered'],
      default: 'unfulfilled'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'unpaid'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'simulated', 'mpesa'],
      required: true
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    notes: { type: String, default: '' },
    timeline: [timelineEventSchema]
  },
  { timestamps: true }
);

orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ customerId: 1 });

export const Order = mongoose.model('Order', orderSchema);
