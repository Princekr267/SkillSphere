import { Request, Response } from 'express';
import User from '../models/User';
import Gig from '../models/Gig';
import Review from '../models/Review';

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
export const toggleUserStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot ban another admin' });

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
        .select('title status budget budgetType category location createdAt escrowStatus')
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
    const gig = await Gig.findByIdAndDelete(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });
    return res.json({ success: true, message: 'Gig deleted by admin' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
