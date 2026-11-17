import express from 'express';
import { Notification } from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = express.Router();

notificationsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(30);
    const unreadCount = await Notification.countDocuments({ read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/mark-all-read', requireAuth, async (_req, res, next) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
