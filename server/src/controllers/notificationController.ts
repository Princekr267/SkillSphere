import { Request, Response } from 'express';
import Notification from '../models/Notification';

// ─── GET /api/notifications ──────────────────────────────────────────────────
export const getNotifications = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  try {
    const notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ success: true, notifications });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────
export const markRead = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, notification });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/notifications/read-all ─────────────────────────────────────────
export const markAllRead = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  try {
    await Notification.updateMany({ userId: user._id, read: false }, { read: true });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
