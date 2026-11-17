import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['owner', 'manager', 'cashier', 'inventory', 'fulfilment', 'customer'],
      default: 'customer'
    },
    permissions: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active'
    },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

export const User = mongoose.model('User', userSchema);
