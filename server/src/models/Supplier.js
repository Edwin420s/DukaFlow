import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, default: '' },
    taxPin: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String, default: '' },
    totalOrders: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 } // KES cents
  },
  { timestamps: true }
);

supplierSchema.index({ name: 1 });
supplierSchema.index({ status: 1 });

export const Supplier = mongoose.model('Supplier', supplierSchema);
