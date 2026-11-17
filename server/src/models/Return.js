import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // KES cents
    reason: {
      type: String,
      enum: ['defective', 'damaged_in_transit', 'wrong_item', 'customer_request', 'expired'],
      required: true
    },
    disposition: {
      type: String,
      enum: ['pending_inspection', 'restock', 'damaged_writeoff', 'supplier_return'],
      default: 'pending_inspection'
    },
    dispositionNotes: { type: String, default: '' }
  },
  { _id: true }
);

const returnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true, uppercase: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    items: [returnItemSchema],
    totalRefundAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['requested', 'inspected', 'completed', 'rejected'],
      default: 'requested'
    },
    notes: { type: String, default: '' },
    inspectedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String }
    }
  },
  { timestamps: true }
);

returnSchema.index({ orderId: 1 });
returnSchema.index({ status: 1 });

export const Return = mongoose.model('Return', returnSchema);
