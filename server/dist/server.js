"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const gigRoutes_1 = __importDefault(require("./routes/gigRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const proposalRoutes_1 = __importDefault(require("./routes/proposalRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const disputeRoutes_1 = __importDefault(require("./routes/disputeRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const socket_1 = require("./socket");
// Load environment variables
dotenv_1.default.config();
// Initialize express application
const app = (0, express_1.default)();
// Connect to MongoDB Database
(0, db_1.connectDB)();
// CORS middleware setup
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));
// Body parser middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Setup static file uploads folder
const uploadsPath = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsPath)) {
    fs_1.default.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsPath));
// API Route mounts
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/gigs', gigRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/proposals', proposalRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/disputes', disputeRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
// Root route for server verification
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'SkillSphere API is running smoothly',
        timestamp: new Date(),
    });
});
// Centralized error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled Server Error:', err);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
});
// Create HTTP server and attach Socket.io
const httpServer = http_1.default.createServer(app);
(0, socket_1.initSocket)(httpServer);
// Start listening
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
