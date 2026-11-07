import nodemailer from 'nodemailer';

export interface DispatchEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
}

/**
 * Establishes a nodemailer SMTP transporter using Gmail or defined SMTP variables.
 */
export const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
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
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
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
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
  }

  return null;
};

/**
 * Detect which email provider is currently configured in the environment.
 */
export const getActiveEmailProvider = (): 'brevo' | 'resend' | 'smtp' | 'none' => {
  if (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  if (user && pass) return 'smtp';
  return 'none';
};

/**
 * Unified email dispatcher:
 * 1. Checks for Brevo HTTP API (HTTPS port 443 — bypasses cloud/Render SMTP port blocks)
 * 2. Checks for Resend HTTP API (HTTPS port 443 — bypasses cloud/Render SMTP port blocks)
 * 3. Falls back to Nodemailer SMTP (works on localhost or hosts with open SMTP ports)
 */
export const dispatchEmail = async ({
  to,
  subject,
  html,
  text,
  fromName = 'SkillSphere Security',
}: DispatchEmailOptions) => {
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.EMAIL_USER || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'noreply@skillsphere.in';

  // 1. Try Brevo REST API (Over HTTPS port 443 — NEVER blocked by Render or cloud firewalls)
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify({
          sender: { name: fromName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Brevo HTTP API error (${response.status}): ${errText}`);
      }

      const data = await response.json().catch(() => ({}));
      console.log(`✅ Email sent successfully via Brevo HTTPS API to ${to}. MessageId: ${(data as any)?.messageId || 'ok'}`);
      return data;
    } catch (err: any) {
      console.error('❌ Brevo dispatch error:', err.message);
      throw err;
    }
  }

  // 2. Try Resend REST API (Over HTTPS port 443 — NEVER blocked by Render or cloud firewalls)
  if (resendApiKey) {
    try {
      const fromHeader = process.env.RESEND_FROM || `${fromName} <onboarding@resend.dev>`;
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend HTTP API error (${response.status}): ${errText}`);
      }

      const data = await response.json().catch(() => ({}));
      console.log(`✅ Email sent successfully via Resend HTTPS API to ${to}.`);
      return data;
    } catch (err: any) {
      console.error('❌ Resend dispatch error:', err.message);
      throw err;
    }
  }

  // 3. Fallback: Nodemailer SMTP (Works on localhost or environments where SMTP ports are not blocked)
  const transporter = getTransporter();
  if (!transporter) {
    const errorMsg = '⚠️ No email service configured. Please set BREVO_API_KEY (recommended for Render), RESEND_API_KEY, or EMAIL_USER & EMAIL_PASS in your environment.';
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const fromAddress = process.env.EMAIL_USER
      ? `"${fromName}" <${process.env.EMAIL_USER}>`
      : `"${fromName}" <noreply@skillsphere.in>`;

    const result = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });
    console.log(`✅ Email sent successfully via Nodemailer SMTP to ${to}.`);
    return result;
  } catch (err: any) {
    console.error('❌ Nodemailer SMTP dispatch error:', err.message);
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout') || err.code === 'ECONNREFUSED') {
      console.error(
        '💡 IMPORTANT: Render Free Tier blocks outbound SMTP traffic on ports 25, 465, and 587. ' +
        'To send emails reliably from Render, use an HTTPS API provider like Brevo (set BREVO_API_KEY) or Resend (set RESEND_API_KEY).'
      );
    }
    throw err;
  }
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
    return await dispatchEmail({
      to,
      fromName: 'SkillSphere Security',
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
      text: `Welcome to SkillSphere! Verify your email address by visiting this link: ${verifyUrl}`,
    });
  } catch (err: any) {
    console.error('❌ Verification email dispatch failed:', err.message);
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
    return await dispatchEmail({
      to,
      fromName: 'SkillSphere Security',
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
      text: `Reset your SkillSphere password by visiting this link: ${resetUrl}`,
    });
  } catch (err: any) {
    console.error('❌ Password reset email dispatch failed:', err.message);
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
    return await dispatchEmail({
      to,
      fromName: 'SkillSphere Security',
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
      text: `Your SkillSphere OTP code is: ${otp}`,
    });
  } catch (err: any) {
    console.error('❌ OTP email dispatch failed:', err.message);
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
    return await dispatchEmail({
      to,
      fromName: 'SkillSphere',
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
    });
  } catch (err: any) {
    console.error('❌ Company approval email dispatch error:', err.message);
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
    return await dispatchEmail({
      to,
      fromName: 'SkillSphere',
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
    });
  } catch (err: any) {
    console.error('❌ Company rejection email dispatch error:', err.message);
    // Do not rethrow — email failure should not break the reject endpoint
  }
};
