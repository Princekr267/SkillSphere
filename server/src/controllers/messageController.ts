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

// ─── GET /api/messages/unread/conversations ─────────────────────────────────
export const getUnreadConversations = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  try {
    const Proposal = require('../models/Proposal').default;

    // 1. Gigs where user is client or accepted freelancer
    const gigs = await Gig.find({
      $or: [{ clientId: user._id }, { acceptedFreelancerId: user._id }]
    })
      .select('_id title clientId acceptedFreelancerId')
      .populate('clientId', 'name avatar')
      .populate('acceptedFreelancerId', 'name avatar');

    const conversations: any[] = [];

    // Check unread messages in primary gig threads
    for (const gig of gigs) {
      const unreadCount = await Message.countDocuments({
        gigId: gig._id,
        senderId: { $ne: user._id },
        read: false
      });

      if (unreadCount > 0) {
        const latestMsg = await Message.findOne({
          gigId: gig._id,
          senderId: { $ne: user._id },
          read: false
        }).sort({ sentAt: -1 });

        const isClient = (gig.clientId as any)?._id?.toString() === user._id.toString();
        const otherParty = isClient ? gig.acceptedFreelancerId : gig.clientId;

        conversations.push({
          gigId: gig._id.toString(),
          gigTitle: gig.title,
          otherParty: {
            name: (otherParty as any)?.name || 'User',
            avatar: (otherParty as any)?.avatar || '',
          },
          unreadCount,
          lastMessage: {
            body: latestMsg ? (latestMsg.body.length > 60 ? latestMsg.body.slice(0, 60) + '...' : latestMsg.body) : '',
            createdAt: latestMsg?.sentAt || new Date(),
          },
        });
      }
    }

    // 2. Also check candidate proposal threads where user is participant
    const proposals = await Proposal.find(
      user.role === 'client'
        ? { gigId: { $in: gigs.map(g => g._id) } }
        : { freelancerId: user._id }
    )
      .populate('freelancerId', 'name avatar')
      .populate({ path: 'gigId', select: 'title clientId', populate: { path: 'clientId', select: 'name avatar' } });

    for (const prop of proposals) {
      // Don't duplicate if already listed under gigId
      if (conversations.some(c => c.gigId === prop._id.toString())) continue;

      const unreadCount = await Message.countDocuments({
        gigId: prop._id,
        senderId: { $ne: user._id },
        read: false
      });

      if (unreadCount > 0) {
        const latestMsg = await Message.findOne({
          gigId: prop._id,
          senderId: { $ne: user._id },
          read: false
        }).sort({ sentAt: -1 });

        const isClient = user.role === 'client';
        const otherParty = isClient ? prop.freelancerId : (prop.gigId as any)?.clientId;

        conversations.push({
          gigId: prop._id.toString(),
          gigTitle: (prop.gigId as any)?.title || 'Candidate Negotiation',
          otherParty: {
            name: (otherParty as any)?.name || 'Candidate',
            avatar: (otherParty as any)?.avatar || '',
          },
          unreadCount,
          lastMessage: {
            body: latestMsg ? (latestMsg.body.length > 60 ? latestMsg.body.slice(0, 60) + '...' : latestMsg.body) : '',
            createdAt: latestMsg?.sentAt || new Date(),
          },
        });
      }
    }

    // Sort by most recent unread message first
    conversations.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

    return res.json({
      success: true,
      conversations: conversations.slice(0, 10),
    });
  } catch (err: any) {
    console.error('getUnreadConversations error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/messages/gig/:gigId/read ──────────────────────────────────────
export const markGigMessagesAsRead = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  const { gigId } = req.params;
  try {
    await Message.updateMany(
      { gigId, senderId: { $ne: user._id }, read: false },
      { read: true }
    );
    return res.json({ success: true, message: 'Messages marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

