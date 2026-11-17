import { AuditLog } from '../models/AuditLog.js';

export async function logAudit({
  req,
  action,
  entityType,
  entityId,
  before = null,
  after = null,
  actor = null
}) {
  try {
    const actorId = actor?._id || req?.user?._id || null;
    const actorName = actor?.name || req?.user?.name || 'System';
    const actorRole = actor?.role || req?.user?.role || 'system';
    const ipAddress = req?.ip || req?.socket?.remoteAddress || '';
    const requestId = req?.id || '';

    await AuditLog.create({
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId: String(entityId),
      before,
      after,
      ipAddress,
      requestId
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
