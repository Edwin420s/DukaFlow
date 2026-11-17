import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    barcode: { type: String, trim: true },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    onHand: { type: Number, required: true, default: 0, min: 0 },
    reserved: { type: Number, required: true, default: 0, min: 0 }
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    unit: { type: String, default: 'piece' },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    taxCategory: { type: String, enum: ['standard', 'zero_rated', 'exempt'], default: 'standard' },
    taxRate: { type: Number, default: 16 },
    onHand: { type: Number, required: true, default: 0, min: 0 },
    reserved: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    status: { type: String, enum: ['active', 'archived', 'draft'], default: 'active' },
    variants: [variantSchema]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.virtual('available').get(function () {
  return Math.max(0, (this.onHand || 0) - (this.reserved || 0));
});

productSchema.virtual('isLowStock').get(function () {
  return this.available <= (this.lowStockThreshold || 0);
});

productSchema.index({ barcode: 1 });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ status: 1, name: 1 });

export const Product = mongoose.model('Product', productSchema);
