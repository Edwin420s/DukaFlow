import express from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const auditLogsRouter = express.Router();

auditLogsRouter.get('/', requireAuth, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { action, entityType, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ logs });
  } catch (err) {
    next(err);
  }
});
