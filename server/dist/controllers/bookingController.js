"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingStatus = exports.getBookings = exports.createBooking = void 0;
const Booking_1 = __importDefault(require("../models/Booking"));
const User_1 = __importDefault(require("../models/User"));
const Gig_1 = __importDefault(require("../models/Gig"));
const Notification_1 = __importDefault(require("../models/Notification"));
const socket_1 = require("../socket");
// @desc    Create a calendar booking
// @route   POST /api/bookings
// @access  Private (Clients only)
const createBooking = async (req, res) => {
    try {
        const { freelancerId, gigId, date, startTime, endTime } = req.body;
        if (!freelancerId || !gigId || !date || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'Please provide all booking fields' });
        }
        const freelancer = await User_1.default.findById(freelancerId);
        if (!freelancer || freelancer.role !== 'freelancer') {
            return res.status(400).json({ success: false, message: 'Invalid freelancer selected' });
        }
        const gig = await Gig_1.default.findById(gigId);
        if (!gig) {
            return res.status(404).json({ success: false, message: 'Gig not found' });
        }
        const booking = await Booking_1.default.create({
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
        const notif = await Notification_1.default.create({
            userId: freelancerId,
            type: 'new_application', // Using existing valid enum type
            title: `Booking Request: ${gig.title}`,
            body: `${req.user?.name}${clientCompany} requested a booking slot for "${gig.title}" on ${new Date(date).toLocaleDateString()}`,
            link: `/freelancer-dashboard`,
        });
        (0, socket_1.sendNotification)(freelancerId.toString(), notif);
        return res.status(201).json({ success: true, booking });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.createBooking = createBooking;
// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
const getBookings = async (req, res) => {
    try {
        const userId = req.user?._id;
        const query = req.user?.role === 'freelancer'
            ? { freelancerId: userId }
            : { clientId: userId };
        const bookings = await Booking_1.default.find(query)
            .populate('clientId', 'name email location companyName avatar bio')
            .populate('freelancerId', 'name email location avatar rating reviewCount hourlyRate skills bio certifications')
            .populate('gigId', 'title status budget budgetType category')
            .sort({ date: 1, startTime: 1 });
        return res.json({ success: true, bookings });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getBookings = getBookings;
// @desc    Update booking status (confirm/cancel)
// @route   PUT /api/bookings/:id/status
// @access  Private
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const booking = await Booking_1.default.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        const userIdStr = req.user?._id.toString();
        const isParticipant = booking.freelancerId.toString() === userIdStr ||
            booking.clientId.toString() === userIdStr;
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorised to update this booking' });
        }
        booking.status = status;
        await booking.save();
        // Fetch gig details for notification title & body
        const gig = await Gig_1.default.findById(booking.gigId);
        const gigTitle = gig ? gig.title : 'Gig';
        // Notify other participant
        const otherUserId = booking.freelancerId.toString() === userIdStr
            ? booking.clientId
            : booking.freelancerId;
        const notif = await Notification_1.default.create({
            userId: otherUserId,
            type: status === 'confirmed' ? 'application_accepted' : 'application_rejected',
            title: `Appointment ${status.toUpperCase()} for "${gigTitle}"`,
            body: `${req.user?.name} has ${status} the booking request for "${gigTitle}" on ${new Date(booking.date).toLocaleDateString()}`,
            link: req.user?.role === 'freelancer' ? '/client-dashboard' : '/freelancer-dashboard',
        });
        (0, socket_1.sendNotification)(otherUserId.toString(), notif);
        return res.json({ success: true, booking });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.updateBookingStatus = updateBookingStatus;
