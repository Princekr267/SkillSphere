import { Request, Response } from 'express';
import Message from '../models/Message';
import Gig from '../models/Gig';
import Warning from '../models/Warning';
import { moderateText } from '../services/moderationService';
import { AuthRequest } from '../middleware/auth';

// Helper: check if user is a gig participant
async function assertParticipant(roomId: string, userId: string, res: Response): Promise<any | null> {
  const Proposal = require('../models/Proposal').default;
  let gig: any = null;
  let proposal: any = null;
  
  gig = await Gig.findById(roomId).select('clientId acceptedFreelancerId');

  if (!gig) {
    proposal = await Proposal.findById(roomId);
    if (proposal) {
      gig = await Gig.findById(proposal.gigId).select('clientId acceptedFreelancerId');
    }
  }

  if (!gig) {
    res.status(404).json({ success: false, message: 'Gig or Chat Thread not found' });
    return null;
  }

  const isClient = gig.clientId.toString() === userId;
  const isAcceptedFreelancer = gig.acceptedFreelancerId?.toString() === userId;
  const isProposalFreelancer = proposal && proposal.freelancerId.toString() === userId;

  if (proposal) {
    if (!isClient && !isProposalFreelancer) {
      res.status(403).json({ success: false, message: 'Not a participant of this private chat' });
      return null;
    }
    return {
      _id: roomId,
      clientId: gig.clientId,
      acceptedFreelancerId: proposal.freelancerId
    };
  }

  if (!isClient && !isAcceptedFreelancer) {
    res.status(403).json({ success: false, message: 'Not a participant of this gig' });
    return null;
  }
  return gig;
}

// ─── GET /api/gigs/:id/messages ─────────────────────────────────────────────
export const getMessages = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  try {
    const gig = await assertParticipant(req.params.id, (user._id as any).toString(), res);
    if (!gig) return;

    // Mark other user's messages in this gig as read
    await Message.updateMany(
      { gigId: req.params.id, senderId: { $ne: user._id }, read: false },
      { read: true }
    );

    const messages = await Message.find({ gigId: req.params.id })
      .populate('senderId', 'name role')
      .sort({ sentAt: 1 })
      .limit(200);

    return res.json({ success: true, messages });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/gigs/:id/messages (REST fallback) ────────────────────────────
export const postMessage = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ success: false, message: 'Message body is required' });

  try {
    const gig = await assertParticipant(req.params.id, (user._id as any).toString(), res);
    if (!gig) return;

    // Moderate text
    const moderation = await moderateText(body);
    const isFlagged = moderation.isToxic;
    const flagReason = moderation.reason || '';
    const savedBody = isFlagged ? '[This message has been flagged for moderation violations]' : body.trim();

    const msg = await Message.create({
      gigId:    req.params.id,
      senderId: user._id,
      body:     savedBody,
      isFlagged,
      flagReason,
    });

    if (isFlagged) {
      await Warning.create({
        type: 'message',
        targetId: msg._id,
        offenderId: user._id,
        content: body.trim(),
        reason: flagReason,
      });
    }

    const populated = await msg.populate('senderId', 'name role');
    return res.status(201).json({ success: true, message: populated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/messages/unread ───────────────────────────────────────────────
export const getUnreadCount = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  try {
    // Find all gigs where user is client or accepted freelancer
    const gigs = await Gig.find({
      $or: [{ clientId: user._id }, { acceptedFreelancerId: user._id }]
    }).select('_id');
    const gigIds = gigs.map(g => g._id);

    const count = await Message.countDocuments({
      gigId: { $in: gigIds },
      senderId: { $ne: user._id },
      read: false
    });

    return res.json({ success: true, count });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
