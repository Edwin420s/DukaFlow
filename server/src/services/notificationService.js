import { Notification } from '../models/Notification.js';

export async function createNotification({ title, message, type = 'system', severity = 'info', link = '' }) {
  try {
    return await Notification.create({ title, message, type, severity, link });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
