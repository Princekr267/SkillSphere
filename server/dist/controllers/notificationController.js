"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
// ─── GET /api/notifications ──────────────────────────────────────────────────
const getNotifications = async (req, res) => {
    const user = req.user;
    try {
        const notifications = await Notification_1.default.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        return res.json({ success: true, notifications });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getNotifications = getNotifications;
// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────
const markRead = async (req, res) => {
    const user = req.user;
    try {
        const notification = await Notification_1.default.findOneAndUpdate({ _id: req.params.id, userId: user._id }, { read: true }, { new: true });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        return res.json({ success: true, notification });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.markRead = markRead;
// ─── PUT /api/notifications/read-all ─────────────────────────────────────────
const markAllRead = async (req, res) => {
    const user = req.user;
    try {
        await Notification_1.default.updateMany({ userId: user._id, read: false }, { read: true });
        return res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.markAllRead = markAllRead;
