import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, required: true, unique: true, uppercase: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    method: { type: String, enum: ['cash', 'simulated', 'mpesa'], required: true },
    status: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'unpaid'
    },
    transactionReference: { type: String, default: '' },
    mpesaDetails: {
      checkoutRequestId: { type: String },
      merchantRequestId: { type: String },
      phoneNumber: { type: String },
      mpesaReceiptNumber: { type: String },
      resultCode: { type: Number },
      resultDesc: { type: String },
      callbackPayload: { type: mongoose.Schema.Types.Mixed }
    },
    cashDetails: {
      tenderedAmount: { type: Number, default: 0 },
      changeAmount: { type: Number, default: 0 },
      cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cashierName: { type: String }
    },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: '' },
    refundedAt: { type: Date }
  },
  { timestamps: true }
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ 'mpesaDetails.checkoutRequestId': 1 });
paymentSchema.index({ transactionReference: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
