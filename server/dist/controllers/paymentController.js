"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionHistory = exports.refundPayment = exports.releasePayment = exports.verifyPayment = exports.createOrder = void 0;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Gig_1 = __importDefault(require("../models/Gig"));
const Proposal_1 = __importDefault(require("../models/Proposal"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const socket_1 = require("../socket");
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret || key_id.includes('placeholder') || key_secret.includes('placeholder')) {
        return null;
    }
    return new razorpay_1.default({ key_id, key_secret });
};
// @desc    Create a Razorpay order for an accepted proposal
// @route   POST /api/payments/create-order
// @access  Private (Client only)
const createOrder = async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'client') {
            return res.status(403).json({ success: false, message: 'Only clients can fund escrows' });
        }
        const { proposalId } = req.body;
        if (!proposalId)
            return res.status(400).json({ success: false, message: 'Proposal ID is required' });
        const proposal = await Proposal_1.default.findById(proposalId);
        if (!proposal)
            return res.status(404).json({ success: false, message: 'Proposal not found' });
        const gig = await Gig_1.default.findById(proposal.gigId);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        if (gig.clientId.toString() !== user._id.toString()) {
            return res.status(403).json({ success: false, message: 'You do not own this gig' });
        }
        const amountINR = proposal.bidAmount;
        const amountPaisa = Math.round(amountINR * 100);
        const razorpay = getRazorpayInstance();
        if (razorpay) {
            const options = {
                amount: amountPaisa,
                currency: 'INR',
                receipt: `receipt_gig_${gig._id}_${Date.now()}`,
            };
            const order = await razorpay.orders.create(options);
            return res.status(200).json({
                success: true,
                mode: 'real',
                orderId: order.id,
                amount: amountINR,
                key: process.env.RAZORPAY_KEY_ID,
            });
        }
        else {
            // Fallback: Simulation Mode for sandbox testing without real keys
            console.warn('Razorpay credentials missing. Running in payment simulation mode.');
            const mockOrderId = `order_sim_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
            return res.status(200).json({
                success: true,
                mode: 'simulation',
                orderId: mockOrderId,
                amount: amountINR,
                message: 'Running in developer test payment simulation mode.',
            });
        }
    }
    catch (error) {
        console.error('createOrder error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error creating order' });
    }
};
exports.createOrder = createOrder;
// @desc    Verify Razorpay payment signature & activate gig escrow
// @route   POST /api/payments/verify
// @access  Private (Client only)
const verifyPayment = async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'client') {
            return res.status(403).json({ success: false, message: 'Only clients can verify payments' });
        }
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, proposalId, mode, } = req.body;
        if (!razorpay_order_id || !proposalId) {
            return res.status(400).json({ success: false, message: 'Order ID and Proposal ID are required' });
        }
        const proposal = await Proposal_1.default.findById(proposalId);
        if (!proposal)
            return res.status(404).json({ success: false, message: 'Proposal not found' });
        const gig = await Gig_1.default.findById(proposal.gigId);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        // Cryptographic signature verification for real payments
        const razorpay = getRazorpayInstance();
        if (razorpay && mode !== 'simulation') {
            if (!razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ success: false, message: 'Signature elements missing' });
            }
            const secret = process.env.RAZORPAY_KEY_SECRET || '';
            const hmac = crypto_1.default.createHmac('sha256', secret);
            hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
            const generated_signature = hmac.digest('hex');
            if (generated_signature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
            }
        }
        // Payment validated! Activate the gig & escrow
        gig.status = 'in_progress';
        gig.escrowStatus = 'funds_deposited';
        gig.acceptedFreelancerId = proposal.freelancerId;
        await gig.save();
        // Set proposal to accepted
        proposal.status = 'accepted';
        await proposal.save();
        // Create Payment log transaction
        await Payment_1.default.create({
            gigId: gig._id,
            proposalId: proposal._id,
            clientId: user._id,
            freelancerId: proposal.freelancerId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id || 'sim_pay_id',
            amount: proposal.bidAmount,
            status: 'escrowed',
            transactionType: 'deposit',
        });
        // Notify freelancer
        const notif = await Notification_1.default.create({
            userId: proposal.freelancerId,
            type: 'application_accepted',
            title: 'Escrow Funded & Activated',
            body: `Client funded "${gig.title}". You can start working now!`,
            link: `/freelancer-dashboard`,
        });
        (0, socket_1.sendNotification)(proposal.freelancerId.toString(), notif);
        res.status(200).json({ success: true, message: 'Payment verified & escrow funded successfully', gig });
    }
    catch (error) {
        console.error('verifyPayment error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error verifying payment' });
    }
};
exports.verifyPayment = verifyPayment;
// @desc    Client completes gig and releases payment to the freelancer
// @route   PUT /api/payments/release/:gigId
// @access  Private (Client only)
const releasePayment = async (req, res) => {
    try {
        const user = req.user;
        const { gigId } = req.params;
        const gig = await Gig_1.default.findById(gigId);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        if (gig.clientId.toString() !== user?._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorised to release funds' });
        }
        if (gig.escrowStatus !== 'funds_deposited') {
            return res.status(400).json({ success: false, message: 'No funded escrow exists to release' });
        }
        // Find original escrow transaction
        const originalPayment = await Payment_1.default.findOne({ gigId, status: 'escrowed', transactionType: 'deposit' });
        if (!originalPayment) {
            return res.status(404).json({ success: false, message: 'Escrow transaction history not found' });
        }
        // Update payment records
        originalPayment.status = 'released';
        await originalPayment.save();
        // Create payout transaction log
        await Payment_1.default.create({
            gigId: gig._id,
            proposalId: originalPayment.proposalId,
            clientId: gig.clientId,
            freelancerId: gig.acceptedFreelancerId,
            razorpayOrderId: originalPayment.razorpayOrderId,
            razorpayPaymentId: originalPayment.razorpayPaymentId,
            amount: originalPayment.amount,
            status: 'released',
            transactionType: 'payout',
        });
        gig.escrowStatus = 'released';
        gig.status = 'completed';
        await gig.save();
        // Update freelancer score/rating
        if (gig.acceptedFreelancerId) {
            const freelancer = await User_1.default.findById(gig.acceptedFreelancerId);
            if (freelancer) {
                const score = freelancer.rating * freelancer.reviewCount + 5;
                freelancer.reviewCount += 1;
                freelancer.rating = parseFloat((score / freelancer.reviewCount).toFixed(2));
                freelancer.completedGigsCount = (freelancer.completedGigsCount || 0) + 1;
                await freelancer.save();
                // Notify freelancer
                const notif = await Notification_1.default.create({
                    userId: gig.acceptedFreelancerId,
                    type: 'escrow_released',
                    title: 'Payment Released!',
                    body: `Client released ₹${originalPayment.amount} for "${gig.title}". check history!`,
                    link: `/freelancer-dashboard`,
                });
                (0, socket_1.sendNotification)(gig.acceptedFreelancerId.toString(), notif);
            }
        }
        // Also update client completedGigsCount
        const client = await User_1.default.findById(gig.clientId);
        if (client) {
            client.completedGigsCount = (client.completedGigsCount || 0) + 1;
            await client.save();
        }
        res.status(200).json({ success: true, message: 'Funds released successfully. Gig marked as completed.', gig });
    }
    catch (error) {
        console.error('releasePayment error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error releasing escrow' });
    }
};
exports.releasePayment = releasePayment;
// @desc    Refund payment to client (on gig cancellation / dispute resolve)
// @route   PUT /api/payments/refund/:gigId
// @access  Private (Owner or Admin only)
const refundPayment = async (req, res) => {
    try {
        const user = req.user;
        const { gigId } = req.params;
        const gig = await Gig_1.default.findById(gigId);
        if (!gig)
            return res.status(404).json({ success: false, message: 'Gig not found' });
        const isOwner = gig.clientId.toString() === user?._id.toString();
        const isAdmin = user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorised to initiate refunds' });
        }
        if (gig.escrowStatus !== 'funds_deposited') {
            return res.status(400).json({ success: false, message: 'No active funded escrow found to refund' });
        }
        const originalPayment = await Payment_1.default.findOne({ gigId, status: 'escrowed', transactionType: 'deposit' });
        if (!originalPayment) {
            return res.status(404).json({ success: false, message: 'Escrow transaction history not found' });
        }
        const razorpay = getRazorpayInstance();
        let refundId = 'sim_refund_id';
        if (razorpay && originalPayment.razorpayPaymentId && !originalPayment.razorpayPaymentId.startsWith('sim_')) {
            try {
                const refund = await razorpay.payments.refund(originalPayment.razorpayPaymentId, {
                    amount: Math.round(originalPayment.amount * 100),
                });
                refundId = refund.id;
            }
            catch (err) {
                console.error('Razorpay Refund failure:', err);
                return res.status(500).json({ success: false, message: `Razorpay Refund Failed: ${err.message}` });
            }
        }
        // Update payment records
        originalPayment.status = 'refunded';
        await originalPayment.save();
        // Create refund transaction log
        await Payment_1.default.create({
            gigId: gig._id,
            proposalId: originalPayment.proposalId,
            clientId: gig.clientId,
            freelancerId: gig.acceptedFreelancerId,
            razorpayOrderId: originalPayment.razorpayOrderId,
            razorpayPaymentId: originalPayment.razorpayPaymentId,
            razorpayRefundId: refundId,
            amount: originalPayment.amount,
            status: 'refunded',
            transactionType: 'refund',
        });
        gig.escrowStatus = 'refunded';
        gig.status = 'cancelled';
        await gig.save();
        // Notify freelancer
        if (gig.acceptedFreelancerId) {
            const notif = await Notification_1.default.create({
                userId: gig.acceptedFreelancerId,
                type: 'application_rejected',
                title: 'Escrow Refunded & Gig Cancelled',
                body: `Client refunded escrow for "${gig.title}". Gig cancelled.`,
                link: `/freelancer-dashboard`,
            });
            (0, socket_1.sendNotification)(gig.acceptedFreelancerId.toString(), notif);
        }
        res.status(200).json({ success: true, message: 'Funds refunded successfully. Gig cancelled.', gig });
    }
    catch (error) {
        console.error('refundPayment error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error refunding escrow' });
    }
};
exports.refundPayment = refundPayment;
// @desc    Get transactions logs for a user
// @route   GET /api/payments/history
// @access  Private
const getTransactionHistory = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorised' });
        let query = {};
        if (user.role === 'client') {
            query.clientId = user._id;
        }
        else if (user.role === 'freelancer') {
            query.freelancerId = user._id;
        }
        else if (user.role === 'admin') {
            // Admin sees everything
        }
        const payments = await Payment_1.default.find(query)
            .populate('gigId', 'title')
            .populate('clientId', 'name')
            .populate('freelancerId', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, payments });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching payment history' });
    }
};
exports.getTransactionHistory = getTransactionHistory;
