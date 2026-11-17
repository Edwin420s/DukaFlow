import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['order', 'inventory', 'payment', 'system'], default: 'system' },
    severity: { type: String, enum: ['info', 'warning', 'alert'], default: 'info' },
    read: { type: Boolean, default: false },
    link: { type: String, default: '' }
  },
  { timestamps: true }
);

notificationSchema.index({ read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
