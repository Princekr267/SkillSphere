import nodemailer from 'nodemailer';

export const getTransporter = () => {
  const token = process.env.MAILTRAP_API_TOKEN;
  const user = process.env.MAILTRAP_USER;
  const pass = process.env.MAILTRAP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: { user, pass }
    });
  }

  if (token) {
    // Standard Mailtrap sandbox fallback or API auth
    return nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: 'api',
        pass: token
      }
    });
  }

  return null;
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const verifyUrl = `http://localhost:5173/verify-email?token=${token}`;

  // Always log link to terminal console for instant local development access
  console.log('\n==================================================');
  console.log('📧 EMAIL VERIFICATION LINK (LOCAL DEV FALLBACK)');
  console.log(`To: ${to}`);
  console.log(`Verification URL: ${verifyUrl}`);
  console.log('==================================================\n');

  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const mailOptions = {
      from: '"SkillSphere Security" <noreply@skillsphere.in>',
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

    return await transporter.sendMail(mailOptions);
  } catch (err: any) {
    console.warn('⚠️ Mailtrap SMTP dispatch error (falling back to terminal URL above):', err.message);
  }
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

  // Always log reset link to terminal console for instant local development access
  console.log('\n==================================================');
  console.log('🔑 PASSWORD RESET LINK (LOCAL DEV FALLBACK)');
  console.log(`To: ${to}`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log('==================================================\n');

  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const mailOptions = {
      from: '"SkillSphere Security" <security@skillsphere.in>',
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

    return await transporter.sendMail(mailOptions);
  } catch (err: any) {
    console.warn('⚠️ Mailtrap SMTP dispatch error (falling back to terminal URL above):', err.message);
  }
};
