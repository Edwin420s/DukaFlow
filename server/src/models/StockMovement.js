import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    variantSku: { type: String },
    change: { type: Number, required: true },
    previousOnHand: { type: Number, required: true },
    newOnHand: { type: Number, required: true },
    reason: {
      type: String,
      required: true,
      enum: [
        'purchase_receive',
        'order_sale',
        'order_cancel',
        'manual_adjustment',
        'count_correction',
        'damaged',
        'expired',
        'return_restock',
        'return_damaged'
      ]
    },
    referenceType: {
      type: String,
      required: true,
      enum: ['purchase_order', 'order', 'return', 'manual', 'audit_count']
    },
    referenceId: { type: String, default: '' },
    notes: { type: String, default: '' },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'System' }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Immutable
  }
);

stockMovementSchema.index({ productId: 1, createdAt: -1 });
stockMovementSchema.index({ reason: 1, createdAt: -1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
