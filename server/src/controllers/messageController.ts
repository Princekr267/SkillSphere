import { Request, Response } from 'express';
import Message from '../models/Message';
import Gig from '../models/Gig';

// Helper: check if user is a gig participant
async function assertParticipant(gigId: string, userId: string, res: Response): Promise<any | null> {
  const gig = await Gig.findById(gigId).select('clientId acceptedFreelancerId');
  if (!gig) { res.status(404).json({ success: false, message: 'Gig not found' }); return null; }

  const isParticipant =
    gig.clientId.toString() === userId ||
    gig.acceptedFreelancerId?.toString() === userId;

  if (!isParticipant) { res.status(403).json({ success: false, message: 'Not a participant of this gig' }); return null; }
  return gig;
}

// ─── GET /api/gigs/:id/messages ─────────────────────────────────────────────
export const getMessages = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  try {
    const gig = await assertParticipant(req.params.id, (user._id as any).toString(), res);
    if (!gig) return;

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

    const msg = await Message.create({
      gigId:    req.params.id,
      senderId: user._id,
      body:     body.trim(),
    });

    const populated = await msg.populate('senderId', 'name role');
    return res.status(201).json({ success: true, message: populated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
