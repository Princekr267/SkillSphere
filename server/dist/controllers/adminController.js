"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectCompany = exports.approveCompany = exports.getPendingCompanies = exports.getWarnings = exports.deleteReview = exports.dismissReviewFlag = exports.getFlaggedReviews = exports.adminDeleteGig = exports.getAllGigsAdmin = exports.toggleUserStatus = exports.getAllUsers = exports.getStats = void 0;
const User_1 = __importDefault(require("../models/User"));
const Gig_1 = __importDefault(require("../models/Gig"));
const Review_1 = __importDefault(require("../models/Review"));
const Warning_1 = __importDefault(require("../models/Warning"));
const Company_1 = __importDefault(require("../models/Company"));
const Notification_1 = __importDefault(require("../models/Notification"));
const socket_1 = require("../socket");
const emailService_1 = require("../services/emailService");
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
        const adminId = req.user?._id?.toString();
        const targetId = req.params.id;
        // Fix 6: Prevent an admin from deactivating their own account
        if (adminId && adminId === targetId) {
            return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
        }
        const user = await User_1.default.findById(targetId).select('-password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        // Prevent toggling another super_admin account
        if (user.role === 'super_admin')
            return res.status(403).json({ success: false, message: 'Cannot ban another super admin' });
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
        // Fix 5: Fetch the gig first to inspect escrow state before deleting
        const gig = await Gig_1.default.findById(req.params.id);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        // Block deletion if funds are currently held in escrow
        if (gig.escrowStatus === 'funds_deposited') {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete a gig with funds in escrow. Resolve via refund or release before deleting.',
            });
        }
        await gig.deleteOne();
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
        // Fix 4: Re-trigger weighted rating recalculation for the reviewee now that this
        // review has been cleared by an admin and should be included in the aggregate score.
        const revieweeId = review.revieweeId;
        const allReviews = await Review_1.default.find({ revieweeId }).populate('gigId');
        const eligibleReviews = allReviews.filter(r => !r.isFlagged);
        let totalWeight = 0;
        let weightedSum = 0;
        eligibleReviews.forEach(r => {
            const ageMs = Date.now() - new Date(r.createdAt).getTime();
            const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
            const wTime = Math.max(0.1, 1 - ageDays / 365.0);
            const isVerified = r.gigId && r.gigId.escrowStatus === 'released';
            const wVerified = isVerified ? 1.0 : 0.5;
            const weight = wTime * wVerified;
            weightedSum += r.rating * weight;
            totalWeight += weight;
        });
        const smartRating = totalWeight > 0 ? weightedSum / totalWeight : 5.0;
        await User_1.default.findByIdAndUpdate(revieweeId, {
            rating: Math.round(smartRating * 10) / 10,
            reviewCount: allReviews.length,
        });
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
// ─── GET /api/admin/companies/pending ────────────────────────────────────────
const getPendingCompanies = async (_req, res) => {
    try {
        const companies = await Company_1.default.find({ status: 'pending' })
            .populate('createdBy', 'name email')
            .sort({ createdAt: 1 }); // oldest first so admins review in order
        return res.json({ success: true, companies });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getPendingCompanies = getPendingCompanies;
// ─── PUT /api/admin/companies/:id/approve ────────────────────────────────────
const approveCompany = async (req, res) => {
    try {
        const company = await Company_1.default.findById(req.params.id).populate('createdBy', 'name email');
        if (!company)
            return res.status(404).json({ success: false, message: 'Company not found' });
        if (company.status === 'approved') {
            return res.status(400).json({ success: false, message: 'Company is already approved' });
        }
        company.status = 'approved';
        company.reviewedBy = req.user._id;
        company.reviewedAt = new Date();
        company.rejectionReason = undefined;
        await company.save();
        // Notify the company creator via in-app notification
        const creator = company.createdBy;
        const notif = await Notification_1.default.create({
            userId: creator._id,
            type: 'company_status_update',
            title: 'Company Approved!',
            body: `Your company "${company.name}" has been approved. You can now share your invite key with team members.`,
            link: `/company/${company._id}`,
        });
        (0, socket_1.sendNotification)(creator._id.toString(), notif);
        // Fire-and-forget email — failure must not break this endpoint
        (0, emailService_1.sendCompanyApprovalEmail)(creator.email, company.name).catch((e) => console.error('Company approval email failed:', e.message));
        return res.json({ success: true, company });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.approveCompany = approveCompany;
// ─── PUT /api/admin/companies/:id/reject ─────────────────────────────────────
const rejectCompany = async (req, res) => {
    try {
        const { rejectionReason } = req.body;
        if (!rejectionReason || !rejectionReason.trim()) {
            return res.status(400).json({ success: false, message: 'A rejection reason is required' });
        }
        const company = await Company_1.default.findById(req.params.id).populate('createdBy', 'name email');
        if (!company)
            return res.status(404).json({ success: false, message: 'Company not found' });
        company.status = 'rejected';
        company.rejectionReason = rejectionReason.trim();
        company.reviewedBy = req.user._id;
        company.reviewedAt = new Date();
        await company.save();
        // Notify the company creator via in-app notification
        const creator = company.createdBy;
        const notif = await Notification_1.default.create({
            userId: creator._id,
            type: 'company_status_update',
            title: 'Company Application Update',
            body: `Your company "${company.name}" was not approved. Reason: ${rejectionReason.trim()}. You can edit and resubmit your application.`,
            link: `/company/${company._id}`,
        });
        (0, socket_1.sendNotification)(creator._id.toString(), notif);
        // Fire-and-forget email
        (0, emailService_1.sendCompanyRejectionEmail)(creator.email, company.name, rejectionReason.trim()).catch((e) => console.error('Company rejection email failed:', e.message));
        return res.json({ success: true, company });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.rejectCompany = rejectCompany;
