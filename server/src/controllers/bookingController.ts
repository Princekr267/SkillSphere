import { Response } from 'express';
import Booking from '../models/Booking';
import User from '../models/User';
import Gig from '../models/Gig';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import { sendNotification } from '../socket';

// @desc    Create a calendar booking
// @route   POST /api/bookings
// @access  Private (Clients only)
export const createBooking = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { freelancerId, gigId, date, startTime, endTime } = req.body;
    if (!freelancerId || !gigId || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Please provide all booking fields' });
    }

    const freelancer = await User.findById(freelancerId);
    if (!freelancer || freelancer.role !== 'freelancer') {
      return res.status(400).json({ success: false, message: 'Invalid freelancer selected' });
    }

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    const booking = await Booking.create({
      freelancerId,
      clientId: req.user?._id,
      gigId,
      date: new Date(date),
      startTime,
      endTime,
      status: 'pending',
    });

    const clientCompany = req.user?.companyName ? ` (${req.user.companyName})` : '';

    // Notify freelancer
    const notif = await Notification.create({
      userId: freelancerId,
      type: 'new_application', // Using existing valid enum type
      title: `Booking Request: ${gig.title}`,
      body: `${req.user?.name}${clientCompany} requested a booking slot for "${gig.title}" on ${new Date(date).toLocaleDateString()}`,
      link: `/freelancer-dashboard`,
    });
    sendNotification(freelancerId.toString(), notif);

    return res.status(201).json({ success: true, booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
export const getBookings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?._id;
    const query = req.user?.role === 'freelancer'
      ? { freelancerId: userId }
      : { clientId: userId };

    const bookings = await Booking.find(query)
      .populate('clientId', 'name email location companyName avatar bio')
      .populate('freelancerId', 'name email location avatar rating reviewCount hourlyRate skills bio certifications')
      .populate('gigId', 'title status budget budgetType category')
      .sort({ date: 1, startTime: 1 });

    return res.json({ success: true, bookings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update booking status (confirm/cancel)
// @route   PUT /api/bookings/:id/status
// @access  Private
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const userIdStr = req.user?._id.toString();
    const isParticipant =
      booking.freelancerId.toString() === userIdStr ||
      booking.clientId.toString() === userIdStr;

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this booking' });
    }

    booking.status = status;
    await booking.save();

    // Fetch gig details for notification title & body
    const gig = await Gig.findById(booking.gigId);
    const gigTitle = gig ? gig.title : 'Gig';

    // Notify other participant
    const otherUserId = booking.freelancerId.toString() === userIdStr
      ? booking.clientId
      : booking.freelancerId;

    const notif = await Notification.create({
      userId: otherUserId,
      type: status === 'confirmed' ? 'application_accepted' : 'application_rejected',
      title: `Appointment ${status.toUpperCase()} for "${gigTitle}"`,
      body: `${req.user?.name} has ${status} the booking request for "${gigTitle}" on ${new Date(booking.date).toLocaleDateString()}`,
      link: req.user?.role === 'freelancer' ? '/client-dashboard' : '/freelancer-dashboard',
    });
    sendNotification(otherUserId.toString(), notif);

    return res.json({ success: true, booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
