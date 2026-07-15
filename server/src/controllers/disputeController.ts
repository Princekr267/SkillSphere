import { Response } from 'express';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import Dispute from '../models/Dispute';
import Gig from '../models/Gig';
import Notification from '../models/Notification';
import { sendNotification } from '../socket';
import { AuthRequest } from '../middleware/auth';

const isCloudinaryConfigured = (): boolean => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  return !!(
    cloud &&
    key &&
    secret &&
    !cloud.includes('placeholder') &&
    !key.includes('placeholder') &&
    !secret.includes('placeholder')
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// @desc    Raise a dispute on a gig
// @route   POST /api/disputes
// @access  Private
export const raiseDispute = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    const { gigId, reason } = req.body;
    if (!gigId || !reason || !reason.trim()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Gig ID and reason are required' });
    }

    const gig = await Gig.findById(gigId);
    if (!gig) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    const isClient = gig.clientId.toString() === user._id.toString();
    const isFreelancer = gig.acceptedFreelancerId?.toString() === user._id.toString();

    if (!isClient && !isFreelancer) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Only active gig participants can raise disputes' });
    }

    const againstId = isClient ? gig.acceptedFreelancerId : gig.clientId;
    if (!againstId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Dispute cannot be raised: no freelancer has been hired yet' });
    }

    let evidenceUrl = '';
    if (req.file) {
      if (isCloudinaryConfigured()) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'skillsphere_disputes',
            resource_type: 'auto',
          });
          evidenceUrl = result.secure_url;
          fs.unlinkSync(req.file.path); // remove temp file
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failure, falling back to local storage:', cloudinaryError);
          evidenceUrl = `/uploads/${req.file.filename}`;
        }
      } else {
        evidenceUrl = `/uploads/${req.file.filename}`;
      }
    }

    const dispute = await Dispute.create({
      gigId,
      raisedById: user._id,
      againstId,
      reason: reason.trim(),
      evidenceUrl,
      status: 'open',
    });

    // Notify opposing party
    const notif = await Notification.create({
      userId: againstId,
      type: 'new_message',
      title: 'Dispute Raised on Gig',
      body: `A dispute has been raised on the gig "${gig.title}"`,
      link: `/gigs/${gig._id}`,
    });
    sendNotification(againstId.toString(), notif);

    res.status(201).json({ success: true, dispute });
  } catch (error: any) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('raiseDispute error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error raising dispute' });
  }
};

// @desc    Get all disputes (admin views all, users view their own)
// @route   GET /api/disputes
// @access  Private
export const getDisputes = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    let query: any = {};
    if (user.role !== 'admin') {
      query.$or = [{ raisedById: user._id }, { againstId: user._id }];
    }

    const disputes = await Dispute.find(query)
      .populate('gigId', 'title status escrowStatus')
      .populate('raisedById', 'name email role')
      .populate('againstId', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, disputes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error fetching disputes' });
  }
};

// @desc    Admin resolves a dispute
// @route   PUT /api/disputes/:id/resolve
// @access  Private (Admin only)
export const resolveDispute = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can resolve disputes' });
    }

    const { resolutionNote } = req.body;
    if (!resolutionNote || !resolutionNote.trim()) {
      return res.status(400).json({ success: false, message: 'Resolution note is required' });
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    dispute.status = 'resolved';
    dispute.resolutionNote = resolutionNote.trim();
    dispute.resolvedAt = new Date();
    await dispute.save();

    const gig = await Gig.findById(dispute.gigId);
    if (gig) {
      // Notify both parties of the resolution
      const notifRaiser = await Notification.create({
        userId: dispute.raisedById,
        type: 'escrow_released',
        title: 'Dispute Resolved',
        body: `Admin resolved dispute on "${gig.title}": ${resolutionNote}`,
        link: `/gigs/${gig._id}`,
      });
      sendNotification(dispute.raisedById.toString(), notifRaiser);

      const notifAgainst = await Notification.create({
        userId: dispute.againstId,
        type: 'escrow_released',
        title: 'Dispute Resolved',
        body: `Admin resolved dispute on "${gig.title}": ${resolutionNote}`,
        link: `/gigs/${gig._id}`,
      });
      sendNotification(dispute.againstId.toString(), notifAgainst);
    }

    res.status(200).json({ success: true, message: 'Dispute resolved successfully', dispute });
  } catch (error: any) {
    console.error('resolveDispute error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error resolving dispute' });
  }
};
