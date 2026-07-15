"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postMessage = exports.getMessages = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const Gig_1 = __importDefault(require("../models/Gig"));
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
        const msg = await Message_1.default.create({
            gigId: req.params.id,
            senderId: user._id,
            body: body.trim(),
        });
        const populated = await msg.populate('senderId', 'name role');
        return res.status(201).json({ success: true, message: populated });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.postMessage = postMessage;
