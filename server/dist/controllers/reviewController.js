"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkReviewed = exports.getReviewsForUser = exports.createReview = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Gig_1 = __importDefault(require("../models/Gig"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const socket_1 = require("../socket");
// ─── POST /api/reviews ──────────────────────────────────────────────────────
// Create a review after a gig is completed.
// Guards: gig must be completed, reviewer must be a participant, once-per-gig.
const createReview = async (req, res) => {
    const { gigId, revieweeId, rating, comment } = req.body;
    const user = req.user;
    if (!gigId || !revieweeId || !rating) {
        return res.status(400).json({ success: false, message: 'gigId, revieweeId and rating are required' });
    }
    try {
        const gig = await Gig_1.default.findById(gigId);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        if (gig.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Reviews can only be left after a gig is completed' });
        }
        // Reviewer must be either the client or the accepted freelancer
        const clientId = gig.clientId.toString();
        const freelancerId = gig.acceptedFreelancerId?.toString();
        const userId = user._id.toString();
        const isParticipant = userId === clientId || userId === freelancerId;
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Only gig participants can leave a review' });
        }
        // Reviewee must be the other participant
        const validReviewee = (userId === clientId && revieweeId === freelancerId) ||
            (userId === freelancerId && revieweeId === clientId);
        if (!validReviewee) {
            return res.status(400).json({ success: false, message: 'Invalid reviewee for this gig' });
        }
        // Fraud detection heuristics
        const fraudFlags = [];
        // Heuristic A: Reviewer has no completed gigs in database history
        const reviewerGigsCount = await Gig_1.default.countDocuments({
            $or: [{ clientId: user._id }, { acceptedFreelancerId: user._id }],
            status: 'completed',
        });
        if (reviewerGigsCount === 0) {
            fraudFlags.push('NO_COMPLETED_GIGS_HISTORY');
        }
        // Heuristic B: Multiple reviews between same users in 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentReviewsBetweenUsers = await Review_1.default.countDocuments({
            reviewerId: user._id,
            revieweeId,
            createdAt: { $gte: thirtyDaysAgo },
        });
        if (recentReviewsBetweenUsers > 0) {
            fraudFlags.push('COLLUSION_SUSPECT_30_DAYS');
        }
        const isFlagged = fraudFlags.length > 0;
        const review = await Review_1.default.create({
            gigId,
            reviewerId: user._id,
            revieweeId,
            rating,
            comment,
            isFlagged,
            fraudFlags,
        });
        // Recalculate reviewee's weighted reputation rating
        const allReviews = await Review_1.default.find({ revieweeId }).populate('gigId');
        let totalWeight = 0;
        let weightedSum = 0;
        allReviews.forEach(r => {
            // Age decay: w_time = max(0.1, 1 - ageInDays / 365)
            const ageMs = Date.now() - new Date(r.createdAt).getTime();
            const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
            const wTime = Math.max(0.1, 1 - ageDays / 365.0);
            // Verified Escrow payment check: w_verified = 1.0 if completed via payment, 0.5 otherwise
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
        // Trigger notification
        const notif = await Notification_1.default.create({
            userId: revieweeId,
            type: 'new_review',
            title: 'New Review Received',
            body: `${user.name} rated you ${rating} ★: "${comment ? comment.substring(0, 50) : ''}"`,
            link: user.role === 'client' ? `/freelancer-dashboard` : `/client-dashboard`,
        });
        (0, socket_1.sendNotification)(revieweeId.toString(), notif);
        return res.status(201).json({ success: true, review });
    }
    catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'You have already reviewed this gig' });
        }
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.createReview = createReview;
// ─── GET /api/reviews/user/:userId ─────────────────────────────────────────
const getReviewsForUser = async (req, res) => {
    try {
        const reviews = await Review_1.default.find({ revieweeId: req.params.userId })
            .populate('reviewerId', 'name role')
            .populate('gigId', 'title')
            .sort({ createdAt: -1 })
            .limit(50);
        return res.json({ success: true, reviews });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getReviewsForUser = getReviewsForUser;
// ─── GET /api/reviews/check/:gigId ─────────────────────────────────────────
// Returns whether the current user has already reviewed this gig
const checkReviewed = async (req, res) => {
    const user = req.user;
    try {
        const existing = await Review_1.default.findOne({ gigId: req.params.gigId, reviewerId: user._id });
        return res.json({ success: true, reviewed: !!existing });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.checkReviewed = checkReviewed;
