"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWarnings = exports.deleteReview = exports.dismissReviewFlag = exports.getFlaggedReviews = exports.adminDeleteGig = exports.getAllGigsAdmin = exports.toggleUserStatus = exports.getAllUsers = exports.getStats = void 0;
const User_1 = __importDefault(require("../models/User"));
const Gig_1 = __importDefault(require("../models/Gig"));
const Review_1 = __importDefault(require("../models/Review"));
const Warning_1 = __importDefault(require("../models/Warning"));
// ─── GET /api/admin/stats ───────────────────────────────────────────────────
const getStats = async (_req, res) => {
    try {
        const [totalUsers, totalGigs, completedGigs, totalFreelancers, totalClients, revenue] = await Promise.all([
            User_1.default.countDocuments(),
            Gig_1.default.countDocuments(),
            Gig_1.default.countDocuments({ status: 'completed' }),
            User_1.default.countDocuments({ role: 'freelancer' }),
            User_1.default.countDocuments({ role: 'client' }),
            Gig_1.default.aggregate([
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
                activeGigs: await Gig_1.default.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
                totalFreelancers,
                totalClients,
                simulatedRevenue: revenue[0]?.total ?? 0,
                totalReviews: await Review_1.default.countDocuments(),
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getStats = getStats;
// ─── GET /api/admin/users ──────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Number(req.query.limit) || 20);
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User_1.default.find()
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User_1.default.countDocuments(),
        ]);
        return res.json({ success: true, users, total, page, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getAllUsers = getAllUsers;
// ─── PUT /api/admin/users/:id/status ────────────────────────────────────────
const toggleUserStatus = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select('-password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        if (user.role === 'admin')
            return res.status(403).json({ success: false, message: 'Cannot ban another admin' });
        const current = user.isActive;
        user.isActive = current === undefined ? false : !current;
        await user.save();
        return res.json({ success: true, user });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.toggleUserStatus = toggleUserStatus;
// ─── GET /api/admin/gigs ────────────────────────────────────────────────────
const getAllGigsAdmin = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Number(req.query.limit) || 20);
        const skip = (page - 1) * limit;
        const [gigs, total] = await Promise.all([
            Gig_1.default.find()
                .populate('clientId', 'name email companyName')
                .select('title status budget budgetType category location createdAt escrowStatus isFlagged flagReason')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Gig_1.default.countDocuments(),
        ]);
        return res.json({ success: true, gigs, total, page, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getAllGigsAdmin = getAllGigsAdmin;
// ─── DELETE /api/admin/gigs/:id ────────────────────────────────────────────
const adminDeleteGig = async (req, res) => {
    try {
        const gig = await Gig_1.default.findByIdAndDelete(req.params.id);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        return res.json({ success: true, message: 'Gig deleted by admin' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.adminDeleteGig = adminDeleteGig;
// ─── GET /api/admin/flagged-reviews ──────────────────────────────────────────
const getFlaggedReviews = async (_req, res) => {
    try {
        const reviews = await Review_1.default.find({ isFlagged: true })
            .populate('reviewerId', 'name email role')
            .populate('revieweeId', 'name email role')
            .populate('gigId', 'title')
            .sort({ createdAt: -1 });
        return res.json({ success: true, reviews });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getFlaggedReviews = getFlaggedReviews;
// ─── PUT /api/admin/reviews/:id/dismiss ──────────────────────────────────────
const dismissReviewFlag = async (req, res) => {
    try {
        const review = await Review_1.default.findByIdAndUpdate(req.params.id, { isFlagged: false, fraudFlags: [] }, { new: true });
        if (!review)
            return res.status(404).json({ success: false, message: 'Review not found' });
        return res.json({ success: true, review });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.dismissReviewFlag = dismissReviewFlag;
// ─── DELETE /api/admin/reviews/:id ──────────────────────────────────────────
const deleteReview = async (req, res) => {
    try {
        const review = await Review_1.default.findByIdAndDelete(req.params.id);
        if (!review)
            return res.status(404).json({ success: false, message: 'Review not found' });
        return res.json({ success: true, message: 'Review deleted by admin' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteReview = deleteReview;
// ─── GET /api/admin/warnings ────────────────────────────────────────────────
const getWarnings = async (_req, res) => {
    try {
        const warnings = await Warning_1.default.find()
            .populate('offenderId', 'name email role')
            .sort({ createdAt: -1 });
        return res.json({ success: true, warnings });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getWarnings = getWarnings;
