import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 }, // percentage or KES cents
    minOrderValue: { type: Number, default: 0, min: 0 }, // KES cents
    maxDiscount: { type: Number, default: null }, // KES cents cap for percentage discount
    usageLimit: { type: Number, default: null },
    usageCount: { type: Number, default: 0 },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

couponSchema.index({ code: 1, isActive: 1 });

export const Coupon = mongoose.model('Coupon', couponSchema);
