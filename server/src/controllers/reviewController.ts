import { Request, Response } from 'express';
import Review from '../models/Review';
import Gig from '../models/Gig';
import User from '../models/User';
import Notification from '../models/Notification';
import { sendNotification } from '../socket';


// ─── POST /api/reviews ──────────────────────────────────────────────────────
// Create a review after a gig is completed.
// Guards: gig must be completed, reviewer must be a participant, once-per-gig.
export const createReview = async (req: Request, res: Response): Promise<any> => {
  const { gigId, revieweeId, rating, comment } = req.body;
  const user = (req as any).user;

  if (!gigId || !revieweeId || !rating) {
    return res.status(400).json({ success: false, message: 'gigId, revieweeId and rating are required' });
  }

  try {
    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    if (gig.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Reviews can only be left after a gig is completed' });
    }

    // Reviewer must be either the client or the accepted freelancer
    const clientId   = gig.clientId.toString();
    const freelancerId = gig.acceptedFreelancerId?.toString();
    const userId = (user._id as any).toString();

    const isParticipant = userId === clientId || userId === freelancerId;
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Only gig participants can leave a review' });
    }

    // Reviewee must be the other participant
    const validReviewee =
      (userId === clientId && revieweeId === freelancerId) ||
      (userId === freelancerId && revieweeId === clientId);
    if (!validReviewee) {
      return res.status(400).json({ success: false, message: 'Invalid reviewee for this gig' });
    }

    const review = await Review.create({
      gigId,
      reviewerId: user._id,
      revieweeId,
      rating,
      comment,
    });

    // Recalculate reviewee's aggregate rating
    const allReviews = await Review.find({ revieweeId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await User.findByIdAndUpdate(revieweeId, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length,
    });

    // Trigger notification
    const notif = await Notification.create({
      userId: revieweeId,
      type: 'new_review',
      title: 'New Review Received',
      body: `${user.name} rated you ${rating} ★: "${comment ? comment.substring(0, 50) : ''}"`,
      link: user.role === 'client' ? `/freelancer-dashboard` : `/client-dashboard`,
    });
    sendNotification(revieweeId.toString(), notif);

    return res.status(201).json({ success: true, review });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this gig' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/reviews/user/:userId ─────────────────────────────────────────
export const getReviewsForUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const reviews = await Review.find({ revieweeId: req.params.userId })
      .populate('reviewerId', 'name role')
      .populate('gigId', 'title')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ success: true, reviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/reviews/check/:gigId ─────────────────────────────────────────
// Returns whether the current user has already reviewed this gig
export const checkReviewed = async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  try {
    const existing = await Review.findOne({ gigId: req.params.gigId, reviewerId: user._id });
    return res.json({ success: true, reviewed: !!existing });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
