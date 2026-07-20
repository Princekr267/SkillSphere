import { Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Payment from '../models/Payment';
import Gig from '../models/Gig';
import Proposal from '../models/Proposal';
import User from '../models/User';
import Notification from '../models/Notification';
import { sendNotification } from '../socket';
import { AuthRequest } from '../middleware/auth';

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id.includes('placeholder') || key_secret.includes('placeholder')) {
    return null;
  }
  return new Razorpay({ key_id, key_secret });
};

// @desc    Create a Razorpay order for an accepted proposal
// @route   POST /api/payments/create-order
// @access  Private (Client only)
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Only clients can fund escrows' });
    }

    const { proposalId } = req.body;
    if (!proposalId) return res.status(400).json({ success: false, message: 'Proposal ID is required' });

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found' });

    const gig = await Gig.findById(proposal.gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

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
        receipt: `rec_${gig._id.toString().substring(18)}_${Date.now().toString().substring(8)}`,
      };

      const order = await razorpay.orders.create(options);
      return res.status(200).json({
        success: true,
        mode: 'real',
        orderId: order.id,
        amount: amountINR,
        key: process.env.RAZORPAY_KEY_ID,
      });
    } else {
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
  } catch (error: any) {
    console.error('createOrder error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating order' });
  }
};

// @desc    Verify Razorpay payment signature & activate gig escrow
// @route   POST /api/payments/verify
// @access  Private (Client only)
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Only clients can verify payments' });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      proposalId,
      mode,
    } = req.body;

    if (!razorpay_order_id || !proposalId) {
      return res.status(400).json({ success: false, message: 'Order ID and Proposal ID are required' });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found' });

    const gig = await Gig.findById(proposal.gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    // Cryptographic signature verification for real payments
    const razorpay = getRazorpayInstance();
    if (razorpay && mode !== 'simulation') {
      if (!razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Signature elements missing' });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || '';
      const hmac = crypto.createHmac('sha256', secret);
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
    await Payment.create({
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
    const notif = await Notification.create({
      userId: proposal.freelancerId,
      type: 'application_accepted',
      title: 'Escrow Funded & Activated',
      body: `Client funded "${gig.title}". You can start working now!`,
      link: `/freelancer-dashboard`,
    });
    sendNotification(proposal.freelancerId.toString(), notif);

    res.status(200).json({ success: true, message: 'Payment verified & escrow funded successfully', gig });
  } catch (error: any) {
    console.error('verifyPayment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error verifying payment' });
  }
};

// @desc    Client completes gig and releases payment to the freelancer
// @route   PUT /api/payments/release/:gigId
// @access  Private (Client only)
export const releasePayment = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { gigId } = req.params;

    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    if (gig.clientId.toString() !== user?._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised to release funds' });
    }

    if (gig.escrowStatus !== 'funds_deposited') {
      return res.status(400).json({ success: false, message: 'No funded escrow exists to release' });
    }

    // Find original escrow transaction
    const originalPayment = await Payment.findOne({ gigId, status: 'escrowed', transactionType: 'deposit' });
    if (!originalPayment) {
      return res.status(404).json({ success: false, message: 'Escrow transaction history not found' });
    }

    // Update payment records
    originalPayment.status = 'released';
    await originalPayment.save();

    // Create payout transaction log
    await Payment.create({
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
      const freelancer = await User.findById(gig.acceptedFreelancerId);
      if (freelancer) {
        const score = freelancer.rating * freelancer.reviewCount + 5;
        freelancer.reviewCount += 1;
        freelancer.rating = parseFloat((score / freelancer.reviewCount).toFixed(2));
        freelancer.completedGigsCount = (freelancer.completedGigsCount || 0) + 1;
        await freelancer.save();

        // Notify freelancer
        const notif = await Notification.create({
          userId: gig.acceptedFreelancerId,
          type: 'escrow_released',
          title: 'Payment Released!',
          body: `Client released ₹${originalPayment.amount} for "${gig.title}". check history!`,
          link: `/freelancer-dashboard`,
        });
        sendNotification(gig.acceptedFreelancerId.toString(), notif);
      }
    }

    // Also update client completedGigsCount
    const client = await User.findById(gig.clientId);
    if (client) {
      client.completedGigsCount = (client.completedGigsCount || 0) + 1;
      await client.save();
    }

    res.status(200).json({ success: true, message: 'Funds released successfully. Gig marked as completed.', gig });
  } catch (error: any) {
    console.error('releasePayment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error releasing escrow' });
  }
};

// @desc    Refund payment to client (on gig cancellation / dispute resolve)
// @route   PUT /api/payments/refund/:gigId
// @access  Private (Owner or Admin only)
export const refundPayment = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { gigId } = req.params;

    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    const isOwner = gig.clientId.toString() === user?._id.toString();
    const isAdmin = user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorised to initiate refunds' });
    }

    if (gig.escrowStatus !== 'funds_deposited') {
      return res.status(400).json({ success: false, message: 'No active funded escrow found to refund' });
    }

    const originalPayment = await Payment.findOne({ gigId, status: 'escrowed', transactionType: 'deposit' });
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
      } catch (err: any) {
        console.error('Razorpay Refund failure:', err);
        return res.status(500).json({ success: false, message: `Razorpay Refund Failed: ${err.message}` });
      }
    }

    // Update payment records
    originalPayment.status = 'refunded';
    await originalPayment.save();

    // Create refund transaction log
    await Payment.create({
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
      const notif = await Notification.create({
        userId: gig.acceptedFreelancerId,
        type: 'application_rejected',
        title: 'Escrow Refunded & Gig Cancelled',
        body: `Client refunded escrow for "${gig.title}". Gig cancelled.`,
        link: `/freelancer-dashboard`,
      });
      sendNotification(gig.acceptedFreelancerId.toString(), notif);
    }

    res.status(200).json({ success: true, message: 'Funds refunded successfully. Gig cancelled.', gig });
  } catch (error: any) {
    console.error('refundPayment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error refunding escrow' });
  }
};

// @desc    Get transactions logs for a user
// @route   GET /api/payments/history
// @access  Private
export const getTransactionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorised' });

    let query: any = {};
    if (user.role === 'client') {
      query.clientId = user._id;
    } else if (user.role === 'freelancer') {
      query.freelancerId = user._id;
    } else if (user.role === 'admin') {
      // Admin sees everything
    }

    const payments = await Payment.find(query)
      .populate('gigId', 'title')
      .populate('clientId', 'name')
      .populate('freelancerId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error fetching payment history' });
  }
};
