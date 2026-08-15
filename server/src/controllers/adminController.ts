import { Request, Response } from 'express';
import User from '../models/User';
import Gig from '../models/Gig';
import Review from '../models/Review';
import Warning from '../models/Warning';
import Company from '../models/Company';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import { sendNotification } from '../socket';
import { sendCompanyApprovalEmail, sendCompanyRejectionEmail } from '../services/emailService';

// ─── GET /api/admin/stats ───────────────────────────────────────────────────
export const getStats = async (_req: Request, res: Response): Promise<any> => {
  try {
    const [totalUsers, totalGigs, completedGigs, totalFreelancers, totalClients, revenue] =
      await Promise.all([
        User.countDocuments(),
        Gig.countDocuments(),
        Gig.countDocuments({ status: 'completed' }),
        User.countDocuments({ role: 'freelancer' }),
        User.countDocuments({ role: 'client' }),
        Gig.aggregate([
          { $match: { escrowStatus: 'released' } },
          { $group: { _id: null, total: { $sum: '$budget' } } },
        ]),
      ]);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalGigs,
        completedGigs,
        activeGigs: await Gig.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        totalFreelancers,
        totalClients,
        simulatedRevenue: revenue[0]?.total ?? 0,
        totalReviews: await Review.countDocuments(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/users ──────────────────────────────────────────────────
export const getAllUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(),
    ]);

    return res.json({ success: true, users, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/users/:id/status ────────────────────────────────────────
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const adminId = (req as any).user?._id?.toString();
    const targetId = req.params.id;

    // Fix 6: Prevent an admin from deactivating their own account
    if (adminId && adminId === targetId) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const user = await User.findById(targetId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent toggling another super_admin account
    if (user.role === 'super_admin') return res.status(403).json({ success: false, message: 'Cannot ban another super admin' });

    const current = (user as any).isActive;
    (user as any).isActive = current === undefined ? false : !current;
    await user.save();


    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/gigs ────────────────────────────────────────────────────
export const getAllGigsAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [gigs, total] = await Promise.all([
      Gig.find()
        .populate('clientId', 'name email companyName')
        .select('title status budget budgetType category location createdAt escrowStatus isFlagged flagReason')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Gig.countDocuments(),
    ]);

    return res.json({ success: true, gigs, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/admin/gigs/:id ────────────────────────────────────────────
export const adminDeleteGig = async (req: Request, res: Response): Promise<any> => {
  try {
    // Fix 5: Fetch the gig first to inspect escrow state before deleting
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    // Block deletion if funds are currently held in escrow
    if (gig.escrowStatus === 'funds_deposited') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete a gig with funds in escrow. Resolve via refund or release before deleting.',
      });
    }

    await gig.deleteOne();
    return res.json({ success: true, message: 'Gig deleted by admin' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/flagged-reviews ──────────────────────────────────────────
export const getFlaggedReviews = async (_req: Request, res: Response): Promise<any> => {
  try {
    const reviews = await Review.find({ isFlagged: true })
      .populate('reviewerId', 'name email role')
      .populate('revieweeId', 'name email role')
      .populate('gigId', 'title')
      .sort({ createdAt: -1 });

    return res.json({ success: true, reviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/reviews/:id/dismiss ──────────────────────────────────────
export const dismissReviewFlag = async (req: Request, res: Response): Promise<any> => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isFlagged: false, fraudFlags: [] },
      { new: true }
    );
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    // Fix 4: Re-trigger weighted rating recalculation for the reviewee now that this
    // review has been cleared by an admin and should be included in the aggregate score.
    const revieweeId = review.revieweeId;
    const allReviews = await Review.find({ revieweeId }).populate('gigId');
    const eligibleReviews = allReviews.filter(r => !r.isFlagged);
    let totalWeight = 0;
    let weightedSum = 0;

    eligibleReviews.forEach(r => {
      const ageMs = Date.now() - new Date(r.createdAt).getTime();
      const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
      const wTime = Math.max(0.1, 1 - ageDays / 365.0);
      const isVerified = r.gigId && (r.gigId as any).escrowStatus === 'released';
      const wVerified = isVerified ? 1.0 : 0.5;
      const weight = wTime * wVerified;
      weightedSum += r.rating * weight;
      totalWeight += weight;
    });

    const smartRating = totalWeight > 0 ? weightedSum / totalWeight : 5.0;
    await User.findByIdAndUpdate(revieweeId, {
      rating: Math.round(smartRating * 10) / 10,
      reviewCount: allReviews.length,
    });

    return res.json({ success: true, review });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/admin/reviews/:id ──────────────────────────────────────────
export const deleteReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    return res.json({ success: true, message: 'Review deleted by admin' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/warnings ────────────────────────────────────────────────
export const getWarnings = async (_req: Request, res: Response): Promise<any> => {
  try {
    const warnings = await Warning.find()
      .populate('offenderId', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ success: true, warnings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/companies/pending ────────────────────────────────────────
export const getPendingCompanies = async (_req: Request, res: Response): Promise<any> => {
  try {
    const companies = await Company.find({ status: 'pending' })
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 }); // oldest first so admins review in order

    return res.json({ success: true, companies });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/companies/:id/approve ────────────────────────────────────
export const approveCompany = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const company = await Company.findById(req.params.id).populate('createdBy', 'name email');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    if (company.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Company is already approved' });
    }

    company.status = 'approved';
    company.reviewedBy = req.user._id;
    company.reviewedAt = new Date();
    company.rejectionReason = undefined;
    await company.save();

    // Notify the company creator via in-app notification
    const creator = company.createdBy as any;
    const notif = await Notification.create({
      userId: creator._id,
      type: 'company_status_update',
      title: 'Company Approved!',
      body: `Your company "${company.name}" has been approved. You can now share your invite key with team members.`,
      link: `/company/${company._id}`,
    });
    sendNotification(creator._id.toString(), notif);

    // Fire-and-forget email — failure must not break this endpoint
    sendCompanyApprovalEmail(creator.email, company.name).catch((e: any) =>
      console.error('Company approval email failed:', e.message)
    );

    return res.json({ success: true, company });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/companies/:id/reject ─────────────────────────────────────
export const rejectCompany = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }

    const company = await Company.findById(req.params.id).populate('createdBy', 'name email');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    company.status = 'rejected';
    company.rejectionReason = rejectionReason.trim();
    company.reviewedBy = req.user._id;
    company.reviewedAt = new Date();
    await company.save();

    // Notify the company creator via in-app notification
    const creator = company.createdBy as any;
    const notif = await Notification.create({
      userId: creator._id,
      type: 'company_status_update',
      title: 'Company Application Update',
      body: `Your company "${company.name}" was not approved. Reason: ${rejectionReason.trim()}. You can edit and resubmit your application.`,
      link: `/company/${company._id}`,
    });
    sendNotification(creator._id.toString(), notif);

    // Fire-and-forget email
    sendCompanyRejectionEmail(creator.email, company.name, rejectionReason.trim()).catch((e: any) =>
      console.error('Company rejection email failed:', e.message)
    );

    return res.json({ success: true, company });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
