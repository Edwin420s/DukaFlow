import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'system' },
    action: { type: String, required: true }, // e.g. 'product.create', 'stock.adjust', 'order.status_change'
    entityType: { type: String, required: true }, // e.g. 'Product', 'Order', 'Payment', 'User'
    entityId: { type: String, required: true },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String, default: '' },
    requestId: { type: String, default: '' }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Append-only
  }
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
