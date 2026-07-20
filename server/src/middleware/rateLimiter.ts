import rateLimit from 'express-rate-limit';

// Limit to max 5 requests per 15 minutes on auth routes (failed/total attempts)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many failed login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit to max 10 gig creations per hour
export const gigPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Gig posting limit exceeded (max 10 posts per hour). Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
