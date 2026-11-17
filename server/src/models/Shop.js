import mongoose from 'mongoose';

const deliveryZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fee: { type: Number, required: true, default: 0 }, // minor units (KES cents)
    estimatedTime: { type: String, default: '1-2 hours' },
    active: { type: Boolean, default: true }
  },
  { _id: true }
);

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: 'DukaFlow Groceries & General Store' },
    slug: { type: String, required: true, unique: true, lowercase: true, default: 'dukaflow' },
    description: { type: String, default: 'Your friendly neighborhood smart duka for fresh goods and essentials.' },
    phone: { type: String, default: '+254 700 000 000' },
    email: { type: String, default: 'info@dukaflow.co.ke' },
    address: {
      street: { type: String, default: 'Biashara Street, Retail Hub' },
      city: { type: String, default: 'Nairobi' },
      country: { type: String, default: 'Kenya' }
    },
    currency: { type: String, default: 'KES' },
    currencySymbol: { type: String, default: 'KSh' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    taxRate: { type: Number, default: 16 }, // 16% VAT
    receiptHeader: { type: String, default: 'DUKAFLOW RETAIL - NAIROBI\nPIN: P051234567Z' },
    receiptFooter: { type: String, default: 'Thank you for shopping with us!\nAsante sana, karibu tena.' },
    businessHours: {
      open: { type: String, default: '07:30' },
      close: { type: String, default: '21:00' },
      isOpen: { type: Boolean, default: true }
    },
    deliveryZones: {
      type: [deliveryZoneSchema],
      default: [
        { name: 'Nairobi CBD & Immediate Area', fee: 15000, estimatedTime: '45 mins', active: true },
        { name: 'Westlands / Parklands', fee: 25000, estimatedTime: '1 hour', active: true },
        { name: 'Kilimani / Kileleshwa / Lavington', fee: 20000, estimatedTime: '1 hour', active: true },
        { name: 'Karen / Langata', fee: 40000, estimatedTime: '1.5 hours', active: true }
      ]
    },
    mpesaConfig: {
      enabled: { type: Boolean, default: true },
      environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
      shortcode: { type: String, default: '174379' },
      passkey: { type: String, default: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' },
      consumerKey: { type: String, default: '' },
      consumerSecret: { type: String, default: '' },
      callbackUrl: { type: String, default: 'http://localhost:4000/api/v1/payments/mpesa/callback' }
    }
  },
  { timestamps: true }
);

export const Shop = mongoose.model('Shop', shopSchema);
