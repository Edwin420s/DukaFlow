import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, default: '' },
    notes: { type: String, default: '' },
    totalOrders: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 }
  },
  { timestamps: true }
);

customerSchema.index({ totalSpend: -1 });

export const Customer = mongoose.model('Customer', customerSchema);
