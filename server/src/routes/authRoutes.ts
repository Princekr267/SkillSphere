import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  generate2FA,
  enable2FA,
  disable2FA,
  verify2FACode,
  googleLogin
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { authLimiter, sensitiveActionLimiter, twoFactorLimiter } from '../middleware/rateLimiter';
import { getActiveEmailProvider, dispatchEmail } from '../services/emailService';

const router = express.Router();

// Public auth routes
router.post('/register', sensitiveActionLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/verify-email', verifyEmail);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', sensitiveActionLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/google', googleLogin);
router.post('/2fa/verify', twoFactorLimiter, verify2FACode);

// Protected profile & 2FA management routes
router.get('/me', protect, getMe);
router.post('/resend-verification', protect, resendVerificationEmail);
router.post('/2fa/generate', protect, generate2FA);
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/disable', protect, disable2FA);

// Email diagnostic routes
router.get('/email-status', (_req, res) => {
  const provider = getActiveEmailProvider();
  res.json({
    success: true,
    activeProvider: provider,
    configured: provider !== 'none',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    hint: provider === 'smtp'
      ? 'Currently using SMTP. Note that Render free tier blocks outbound SMTP ports (25, 465, 587). If deployed on Render free tier, set BREVO_API_KEY in Render to send emails via HTTPS port 443.'
      : provider === 'none'
      ? 'No email service configured. Please set BREVO_API_KEY (recommended for Render) or EMAIL_USER & EMAIL_PASS in your deployment environment variables.'
      : `Email is actively powered by ${provider.toUpperCase()} over HTTPS port 443.`,
  });
});

router.post('/test-email', sensitiveActionLimiter, async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({
      success: false,
      message: 'Please provide recipient email: { "to": "your@email.com" }',
    });
  }

  try {
    const provider = getActiveEmailProvider();
    await dispatchEmail({
      to,
      subject: 'SkillSphere Email Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #EFF2ED; color: #1B2621; border: 2px solid #1B2621; border-radius: 4px;">
          <h2>SkillSphere Email Test Successful! ✅</h2>
          <p>This is a test email sent from the SkillSphere backend using the <strong>${provider.toUpperCase()}</strong> provider.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
      text: `SkillSphere Email Test Successful! Provider: ${provider}`,
      fromName: 'SkillSphere Test',
    });

    res.json({
      success: true,
      provider,
      message: `Test email sent successfully to ${to} via ${provider}!`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test email.',
      error: error.message,
      provider: getActiveEmailProvider(),
      tip: 'Render free tier blocks SMTP ports (25, 465, 587). Add BREVO_API_KEY to Render Environment Variables to send via HTTPS.',
    });
  }
});

export default router;
