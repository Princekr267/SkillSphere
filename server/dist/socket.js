"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.sendNotification = sendNotification;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Message_1 = __importDefault(require("./models/Message"));
const Gig_1 = __importDefault(require("./models/Gig"));
const User_1 = __importDefault(require("./models/User"));
const JWT_SECRET = process.env.JWT_SECRET || 'skillsphere_secure_jwt_secret_key_2026';
let ioInstance = null;
function initSocket(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    ioInstance = io;
    // ─── Auth middleware ────────────────────────────────────────────────────────
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error('Authentication error: no token'));
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = await User_1.default.findById(decoded.id).select('_id name role');
            if (!user)
                return next(new Error('Authentication error: user not found'));
            socket.user = user;
            next();
        }
        catch {
            next(new Error('Authentication error: invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const socketUser = socket.user;
        const userIdStr = socketUser._id.toString();
        // Join personal notification room
        socket.join(`user-${userIdStr}`);
        // ── join_room (gigs/chat) ──────────────────────────────────────────────────
        socket.on('join_room', async (gigId) => {
            try {
                const gig = await Gig_1.default.findById(gigId).select('clientId acceptedFreelancerId');
                if (!gig)
                    return socket.emit('error', 'Gig not found');
                const uid = socketUser._id.toString();
                const isParticipant = gig.clientId.toString() === uid ||
                    gig.acceptedFreelancerId?.toString() === uid;
                if (!isParticipant)
                    return socket.emit('error', 'Not a participant of this gig');
                socket.join(`gig-${gigId}`);
                socket.emit('joined_room', { gigId });
            }
            catch (err) {
                socket.emit('error', 'Could not join room');
            }
        });
        // ── send_message ──────────────────────────────────────────────────────────
        socket.on('send_message', async ({ gigId, body }) => {
            if (!body?.trim())
                return;
            try {
                const gig = await Gig_1.default.findById(gigId).select('clientId acceptedFreelancerId title');
                if (!gig)
                    return socket.emit('error', 'Gig not found');
                const uid = socketUser._id.toString();
                const isParticipant = gig.clientId.toString() === uid ||
                    gig.acceptedFreelancerId?.toString() === uid;
                if (!isParticipant)
                    return socket.emit('error', 'Not authorised');
                const msg = await Message_1.default.create({
                    gigId,
                    senderId: socketUser._id,
                    body: body.trim(),
                });
                const populated = await msg.populate('senderId', 'name role');
                // Broadcast to everyone in the room (including sender for confirmation)
                io.to(`gig-${gigId}`).emit('receive_message', populated);
                // Also trigger an in-app notification to the other participant
                const otherUserId = gig.clientId.toString() === uid
                    ? gig.acceptedFreelancerId?.toString()
                    : gig.clientId.toString();
                if (otherUserId) {
                    const Notification = require('./models/Notification').default;
                    const notif = await Notification.create({
                        userId: otherUserId,
                        type: 'new_message',
                        title: `New message on ${gig.title}`,
                        body: `${socketUser.name}: ${body.substring(0, 60)}${body.length > 60 ? '...' : ''}`,
                        link: `/gigs/${gig._id}/chat`,
                    });
                    sendNotification(otherUserId, notif);
                }
            }
            catch (err) {
                socket.emit('error', 'Message send failed');
            }
        });
        socket.on('disconnect', () => {
            // No-op — Socket.io handles room cleanup automatically
        });
    });
    return io;
}
function sendNotification(userId, notification) {
    if (ioInstance) {
        ioInstance.to(`user-${userId}`).emit('new_notification', notification);
    }
}
