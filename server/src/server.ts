import dotenv from 'dotenv';
dotenv.config();

import { getJwtSecret } from './utils/jwtSecret';
// Eagerly validate JWT_SECRET on startup — throws in production if unset
getJwtSecret();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import gigRoutes from './routes/gigRoutes';
import reviewRoutes from './routes/reviewRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import proposalRoutes from './routes/proposalRoutes';
import paymentRoutes from './routes/paymentRoutes';
import disputeRoutes from './routes/disputeRoutes';
import aiRoutes from './routes/aiRoutes';
import bookingRoutes from './routes/bookingRoutes';
import companyRoutes from './routes/companyRoutes';
import messageRoutes from './routes/messageRoutes';
import { initSocket } from './socket';


// Load environment variables

// Initialize express application
const app = express();

// Connect to MongoDB Database
connectDB();

// CORS middleware setup
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim().replace(/\/$/, ''));
}
if (process.env.ALLOWED_ORIGINS) {
  const extraOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, ''));
  allowedOrigins.push(...extraOrigins);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    if (
      allowedOrigins.includes(cleanOrigin) ||
      allowedOrigins.includes('*') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.onrender.com')
    ) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup static file uploads folder
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// API Route mounts
app.use('/api/auth',    authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/gigs',    gigRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/messages', messageRoutes);


// Root route for server verification
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'SkillSphere API is running smoothly',
    timestamp: new Date(),
  });
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Create HTTP server and attach Socket.io
const httpServer = http.createServer(app);
initSocket(httpServer);

// Start listening
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
