"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.postMessage = exports.getMessages = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const Gig_1 = __importDefault(require("../models/Gig"));
const Warning_1 = __importDefault(require("../models/Warning"));
const moderationService_1 = require("../services/moderationService");
// Helper: check if user is a gig participant
async function assertParticipant(gigId, userId, res) {
    const gig = await Gig_1.default.findById(gigId).select('clientId acceptedFreelancerId');
    if (!gig) {
        res.status(404).json({ success: false, message: 'Gig not found' });
        return null;
    }
    const isParticipant = gig.clientId.toString() === userId ||
        gig.acceptedFreelancerId?.toString() === userId;
    if (!isParticipant) {
        res.status(403).json({ success: false, message: 'Not a participant of this gig' });
        return null;
    }
    return gig;
}
// ─── GET /api/gigs/:id/messages ─────────────────────────────────────────────
const getMessages = async (req, res) => {
    const user = req.user;
    try {
        const gig = await assertParticipant(req.params.id, user._id.toString(), res);
        if (!gig)
            return;
        // Mark other user's messages in this gig as read
        await Message_1.default.updateMany({ gigId: req.params.id, senderId: { $ne: user._id }, read: false }, { read: true });
        const messages = await Message_1.default.find({ gigId: req.params.id })
            .populate('senderId', 'name role')
            .sort({ sentAt: 1 })
            .limit(200);
        return res.json({ success: true, messages });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMessages = getMessages;
// ─── POST /api/gigs/:id/messages (REST fallback) ────────────────────────────
const postMessage = async (req, res) => {
    const user = req.user;
    const { body } = req.body;
    if (!body?.trim())
        return res.status(400).json({ success: false, message: 'Message body is required' });
    try {
        const gig = await assertParticipant(req.params.id, user._id.toString(), res);
        if (!gig)
            return;
        // Moderate text
        const moderation = await (0, moderationService_1.moderateText)(body);
        const isFlagged = moderation.isToxic;
        const flagReason = moderation.reason || '';
        const savedBody = isFlagged ? '[This message has been flagged for moderation violations]' : body.trim();
        const msg = await Message_1.default.create({
            gigId: req.params.id,
            senderId: user._id,
            body: savedBody,
            isFlagged,
            flagReason,
        });
        if (isFlagged) {
            await Warning_1.default.create({
                type: 'message',
                targetId: msg._id,
                offenderId: user._id,
                content: body.trim(),
                reason: flagReason,
            });
        }
        const populated = await msg.populate('senderId', 'name role');
        return res.status(201).json({ success: true, message: populated });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.postMessage = postMessage;
// ─── GET /api/messages/unread ───────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
    const user = req.user;
    try {
        // Find all gigs where user is client or accepted freelancer
        const gigs = await Gig_1.default.find({
            $or: [{ clientId: user._id }, { acceptedFreelancerId: user._id }]
        }).select('_id');
        const gigIds = gigs.map(g => g._id);
        const count = await Message_1.default.countDocuments({
            gigId: { $in: gigIds },
            senderId: { $ne: user._id },
            read: false
        });
        return res.json({ success: true, count });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getUnreadCount = getUnreadCount;
