import nodemailer from 'nodemailer';

/**
 * Establishes a nodemailer SMTP transporter using Gmail or defined SMTP variables.
 */
export const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true'; // true for port 465, false for other ports
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  // If a host is explicitly defined
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  // Fallback: If Gmail credentials are provided, use Gmail service directly
  if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  return null;
};

/**
 * Send account verification email
 */
export const sendVerificationEmail = async (to: string, token: string) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  // Always log link to terminal console for instant local development access
  console.log('\n==================================================');
  console.log('📧 EMAIL VERIFICATION LINK (LOCAL DEV FALLBACK)');
  console.log(`To: ${to}`);
  console.log(`Verification URL: ${verifyUrl}`);
  console.log('==================================================\n');

  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('⚠️ SMTP Transporter is not configured. Email cannot be sent.');
      return;
    }

    // Gmail SMTP service requires 'from' to match the authenticated user email to prevent dispatch failures
    const fromAddress = process.env.EMAIL_USER 
      ? `"SkillSphere Security" <${process.env.EMAIL_USER}>` 
      : '"SkillSphere Security" <noreply@skillsphere.in>';

    const mailOptions = {
      from: fromAddress,
      to,
      subject: 'Verify your SkillSphere Account',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #EFF2ED; color: #1B2621; border: 2px solid #1B2621; border-radius: 4px;">
          <h2 style="font-family: cursive; text-transform: uppercase;">Welcome to SkillSphere! 🌟</h2>
          <p>Please click the button below to verify your email address and activate your account:</p>
          <div style="margin: 20px 0;">
            <a href="${verifyUrl}" style="background-color: #0F7A73; color: white; border: 2px solid #1B2621; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 11px; color: #46607A;">Or copy and paste this link in your browser: <br/> <a href="${verifyUrl}">${verifyUrl}</a></p>
        </div>
      `,
      text: `Welcome to SkillSphere! Verify your email address by visiting this link: ${verifyUrl}`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully via Nodemailer SMTP.');
    return result;
  } catch (err: any) {
    console.error('❌ Nodemailer SMTP dispatch error:', err.message);
    throw err;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (to: string, token: string) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  // Always log reset link to terminal console for instant local development access
  console.log('\n==================================================');
  console.log('🔑 PASSWORD RESET LINK (LOCAL DEV FALLBACK)');
  console.log(`To: ${to}`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log('==================================================\n');

  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('⚠️ SMTP Transporter is not configured. Email cannot be sent.');
      return;
    }

    const fromAddress = process.env.EMAIL_USER 
      ? `"SkillSphere Security" <${process.env.EMAIL_USER}>` 
      : '"SkillSphere Security" <security@skillsphere.in>';

    const mailOptions = {
      from: fromAddress,
      to,
      subject: 'Reset your SkillSphere Password',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #EFF2ED; color: #1B2621; border: 2px solid #1B2621; border-radius: 4px;">
          <h2 style="font-family: cursive; text-transform: uppercase;">Password Reset Request 🔑</h2>
          <p>We received a request to reset the password for your account.</p>
          <p>Click the button below to complete the setup of your new password (expires in 1 hour):</p>
          <div style="margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #E2543C; color: white; border: 2px solid #1B2621; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 11px; color: #46607A;">Or copy and paste this link in your browser: <br/> <a href="${resetUrl}">${resetUrl}</a></p>
        </div>
      `,
      text: `Reset your SkillSphere password by visiting this link: ${resetUrl}`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully via Nodemailer SMTP.');
    return result;
  } catch (err: any) {
    console.error('❌ Nodemailer SMTP dispatch error:', err.message);
    throw err;
  }
};

/**
 * Send 2FA One-Time Password (OTP) email
 */
export const sendOTPEmail = async (to: string, otp: string) => {
  // Always log OTP to terminal console for instant local development access
  console.log('\n==================================================');
  console.log('🔒 TWO-FACTOR AUTHENTICATION OTP CODE');
  console.log(`To: ${to}`);
  console.log(`OTP Code: ${otp}`);
  console.log('==================================================\n');

  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('⚠️ SMTP Transporter is not configured. Email cannot be sent.');
      return;
    }

    const fromAddress = process.env.EMAIL_USER 
      ? `"SkillSphere Security" <${process.env.EMAIL_USER}>` 
      : '"SkillSphere Security" <security@skillsphere.in>';

    const mailOptions = {
      from: fromAddress,
      to,
      subject: 'Your SkillSphere OTP Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #EFF2ED; color: #1B2621; border: 2px solid #1B2621; border-radius: 4px;">
          <h2 style="font-family: cursive; text-transform: uppercase;">Two-Factor Authentication 🔒</h2>
          <p>Please enter the following 6-digit One-Time Password (OTP) code to log in to your account:</p>
          <div style="margin: 20px 0; text-align: center;">
            <span style="font-family: monospace; font-size: 32px; font-weight: bold; background-color: #F0F4E8; border: 2px dashed #1B2621; padding: 10px 25px; letter-spacing: 5px; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p style="font-size: 11px; color: #46607A;">If you did not request this code, please secure your account credentials immediately.</p>
        </div>
      `,
      text: `Your SkillSphere OTP code is: ${otp}`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully via Nodemailer SMTP.');
    return result;
  } catch (err: any) {
    console.error('❌ Nodemailer SMTP dispatch error:', err.message);
    throw err;
  }
};

/**
 * Send company approval notification email
 */
export const sendCompanyApprovalEmail = async (to: string, companyName: string) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  console.log('\n==================================================');
  console.log('🏢 COMPANY APPROVED EMAIL (LOCAL DEV FALLBACK)');
  console.log(`To: ${to}`);
  console.log(`Company: ${companyName}`);
  console.log('==================================================\n');

  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('⚠️ SMTP Transporter is not configured. Email cannot be sent.');
      return;
    }

    const fromAddress = process.env.EMAIL_USER
      ? `"SkillSphere" <${process.env.EMAIL_USER}>`
      : '"SkillSphere" <noreply@skillsphere.in>';

    const mailOptions = {
      from: fromAddress,
      to,
      subject: `Your company "${companyName}" has been approved on SkillSphere`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #EFF2ED; color: #1B2621; border: 2px solid #1B2621; border-radius: 4px;">
          <h2 style="font-family: cursive; text-transform: uppercase;">Company Approved! 🎉</h2>
          <p>Great news — your company <strong>${companyName}</strong> has been reviewed and approved by the SkillSphere team.</p>
          <p>You can now:</p>
          <ul>
            <li>Access your invite key and invite team members</li>
            <li>View all company-wide gigs from your Company Dashboard</li>
          </ul>
          <div style="margin: 20px 0;">
            <a href="${frontendUrl}" style="background-color: #0F7A73; color: white; border: 2px solid #1B2621; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
      `,
      text: `Your company "${companyName}" has been approved on SkillSphere. Log in to access your invite key and company dashboard.`,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Company approval email sent successfully via Nodemailer SMTP.');
    return result;
  } catch (err: any) {
    console.error('❌ Nodemailer SMTP dispatch error:', err.message);
    // Do not rethrow — email failure should not break the approve endpoint
  }
};

/**
 * Send company rejection notification email
 */
export const sendCompanyRejectionEmail = async (to: string, companyName: string, reason: string) => {
  console.log('\n==================================================');
  console.log('🏢 COMPANY REJECTED EMAIL (LOCAL DEV FALLBACK)');
  console.log(`To: ${to}`);
  console.log(`Company: ${companyName}`);
  console.log(`Reason: ${reason}`);
  console.log('==================================================\n');

  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('⚠️ SMTP Transporter is not configured. Email cannot be sent.');
      return;
    }

    const fromAddress = process.env.EMAIL_USER
      ? `"SkillSphere" <${process.env.EMAIL_USER}>`
      : '"SkillSphere" <noreply@skillsphere.in>';

    const mailOptions = {
      from: fromAddress,
      to,
      subject: `Update on your company application — "${companyName}"`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #EFF2ED; color: #1B2621; border: 2px solid #1B2621; border-radius: 4px;">
          <h2 style="font-family: cursive; text-transform: uppercase;">Company Application Update</h2>
          <p>Your company application for <strong>${companyName}</strong> has been reviewed.</p>
          <p>Unfortunately, your application was not approved at this time. Reason:</p>
          <blockquote style="border-left: 4px solid #E2543C; margin: 12px 0; padding: 8px 16px; background-color: #fdf2f0;">
            ${reason}
          </blockquote>
          <p>You can update your application details and resubmit from your Company Dashboard.</p>
        </div>
      `,
      text: `Your company application for "${companyName}" was not approved. Reason: ${reason}. You can resubmit via your dashboard.`,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Company rejection email sent successfully via Nodemailer SMTP.');
    return result;
  } catch (err: any) {
    console.error('❌ Nodemailer SMTP dispatch error:', err.message);
    // Do not rethrow — email failure should not break the reject endpoint
  }
};

