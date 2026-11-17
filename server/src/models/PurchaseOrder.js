import mongoose from 'mongoose';

const poItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    orderedQuantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, required: true, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 }
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true, uppercase: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true },
    items: [poItemSchema],
    status: {
      type: String,
      enum: ['draft', 'ordered', 'partially_received', 'received', 'cancelled'],
      default: 'draft'
    },
    expectedDate: { type: Date },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' },
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: 'Staff' }
    },
    receivedAt: { type: Date }
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ supplierId: 1, status: 1 });

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
