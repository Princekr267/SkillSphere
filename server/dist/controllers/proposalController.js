"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondToProposal = exports.getProposalsForGig = exports.createProposal = void 0;
const Proposal_1 = __importDefault(require("../models/Proposal"));
const Gig_1 = __importDefault(require("../models/Gig"));
const Notification_1 = __importDefault(require("../models/Notification"));
const socket_1 = require("../socket");
// @desc    Freelancer submits a proposal to a gig
// @route   POST /api/gigs/:id/proposals
// @access  Private (Freelancer only)
const createProposal = async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'freelancer') {
            return res.status(403).json({ success: false, message: 'Only freelancers can submit proposals' });
        }
        const { coverLetter, bidAmount, completionTime } = req.body;
        const gigId = req.params.id;
        if (!coverLetter || !bidAmount || !completionTime) {
            return res.status(400).json({ success: false, message: 'All proposal fields are required' });
        }
        const gig = await Gig_1.default.findById(gigId);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        if (gig.status !== 'open') {
            return res.status(400).json({ success: false, message: 'This gig is no longer accepting proposals' });
        }
        // Check duplicate proposal
        const existingProposal = await Proposal_1.default.findOne({ gigId, freelancerId: user._id });
        if (existingProposal) {
            return res.status(400).json({ success: false, message: 'You have already submitted a proposal for this gig' });
        }
        const proposal = await Proposal_1.default.create({
            gigId,
            freelancerId: user._id,
            coverLetter: coverLetter.trim(),
            bidAmount: Number(bidAmount),
            completionTime: Number(completionTime),
            status: 'pending',
            lastProposedBy: 'freelancer',
        });
        // Mirror to gig.applicants to preserve compatibility with existing code
        const alreadyApplied = gig.applicants.some(a => a.freelancerId.toString() === user._id.toString());
        if (!alreadyApplied) {
            gig.applicants.push({
                freelancerId: user._id,
                message: coverLetter.trim(),
                appliedAt: new Date(),
                status: 'pending',
            });
            await gig.save();
        }
        // In-app Notification to client
        const notif = await Notification_1.default.create({
            userId: gig.clientId,
            type: 'new_application',
            title: 'New Bid Received',
            body: `${user.name} submitted a bid of ₹${bidAmount} for "${gig.title}"`,
            link: `/client-dashboard`,
        });
        (0, socket_1.sendNotification)(gig.clientId.toString(), notif);
        res.status(201).json({ success: true, proposal });
    }
    catch (error) {
        console.error('createProposal error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error submitting proposal' });
    }
};
exports.createProposal = createProposal;
// @desc    Get all proposals for a gig (authorized: client owner or proposal freelancer)
// @route   GET /api/gigs/:id/proposals
// @access  Private
const getProposalsForGig = async (req, res) => {
    try {
        const user = req.user;
        const gigId = req.params.id;
        const gig = await Gig_1.default.findById(gigId);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        const isClientOwner = gig.clientId.toString() === user?._id.toString();
        let query = { gigId };
        if (!isClientOwner) {
            // Freelancer can only see their own proposal
            query.freelancerId = user?._id;
        }
        const proposals = await Proposal_1.default.find(query)
            .populate('freelancerId', 'name rating reviewCount skills hourlyRate avatar location')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, proposals });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching proposals' });
    }
};
exports.getProposalsForGig = getProposalsForGig;
// @desc    Client or freelancer responds to a proposal (accept, reject, negotiate)
// @route   PUT /api/proposals/:proposalId
// @access  Private
const respondToProposal = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorised' });
        const { action, counterAmount } = req.body; // action: 'accepted' | 'rejected' | 'negotiate'
        const { proposalId } = req.params;
        const proposal = await Proposal_1.default.findById(proposalId);
        if (!proposal)
            return res.status(404).json({ success: false, message: 'Proposal not found' });
        const gig = await Gig_1.default.findById(proposal.gigId);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        const isClient = gig.clientId.toString() === user._id.toString();
        const isFreelancer = proposal.freelancerId.toString() === user._id.toString();
        if (!isClient && !isFreelancer) {
            return res.status(403).json({ success: false, message: 'Not authorized to respond to this proposal' });
        }
        if (action === 'accepted') {
            // Client accepts the proposal
            if (!isClient) {
                // Freelancer can accept too, but only if there is a pending counter-offer from the client
                if (proposal.status !== 'negotiating' || proposal.lastProposedBy !== 'client') {
                    return res.status(400).json({ success: false, message: 'Only clients can accept original bids' });
                }
            }
            proposal.status = 'accepted';
            await proposal.save();
            // Reject all other proposals for this gig
            await Proposal_1.default.updateMany({ gigId: gig._id, _id: { $ne: proposal._id } }, { status: 'rejected' });
            // Mirror status inside gig.applicants array
            gig.applicants.forEach(app => {
                if (app.freelancerId.toString() === proposal.freelancerId.toString()) {
                    app.status = 'accepted';
                }
                else {
                    app.status = 'rejected';
                }
            });
            // We do not set gig to in_progress yet; client must pay first to activate it.
            await gig.save();
            // Notify other party
            const notifyUserId = isClient ? proposal.freelancerId : gig.clientId;
            const notif = await Notification_1.default.create({
                userId: notifyUserId,
                type: 'application_accepted',
                title: 'Bid Accepted!',
                body: `The bid for "${gig.title}" has been accepted!`,
                link: isClient ? '/freelancer-dashboard' : '/client-dashboard',
            });
            (0, socket_1.sendNotification)(notifyUserId.toString(), notif);
        }
        else if (action === 'rejected') {
            proposal.status = 'rejected';
            await proposal.save();
            // Mirror to gig.applicants
            gig.applicants.forEach(app => {
                if (app.freelancerId.toString() === proposal.freelancerId.toString()) {
                    app.status = 'rejected';
                }
            });
            await gig.save();
            const notifyUserId = isClient ? proposal.freelancerId : gig.clientId;
            const notif = await Notification_1.default.create({
                userId: notifyUserId,
                type: 'application_rejected',
                title: 'Bid Declined',
                body: `The proposal bid for "${gig.title}" was declined.`,
                link: isClient ? '/freelancer-dashboard' : '/client-dashboard',
            });
            (0, socket_1.sendNotification)(notifyUserId.toString(), notif);
        }
        else if (action === 'negotiate') {
            if (!counterAmount || isNaN(Number(counterAmount)) || Number(counterAmount) <= 0) {
                return res.status(400).json({ success: false, message: 'Please provide a valid counter-offer amount' });
            }
            proposal.status = 'negotiating';
            proposal.bidAmount = Number(counterAmount);
            proposal.lastProposedBy = user.role;
            if (isClient) {
                proposal.clientCounterAmount = Number(counterAmount);
            }
            else {
                proposal.freelancerCounterAmount = Number(counterAmount);
            }
            await proposal.save();
            // Notify other party
            const notifyUserId = isClient ? proposal.freelancerId : gig.clientId;
            const notif = await Notification_1.default.create({
                userId: notifyUserId,
                type: 'new_message',
                title: 'New Bid Counter-Offer',
                body: `${user.name} proposed a counter bid of ₹${counterAmount} for "${gig.title}"`,
                link: isClient ? '/freelancer-dashboard' : '/client-dashboard',
            });
            (0, socket_1.sendNotification)(notifyUserId.toString(), notif);
        }
        else {
            return res.status(400).json({ success: false, message: 'Invalid proposal action' });
        }
        res.status(200).json({ success: true, proposal });
    }
    catch (error) {
        console.error('respondToProposal error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error updating proposal' });
    }
};
exports.respondToProposal = respondToProposal;
