"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendVerificationEmail = exports.getTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const getTransporter = () => {
    const token = process.env.MAILTRAP_API_TOKEN;
    if (token) {
        return nodemailer_1.default.createTransport({
            host: 'sandbox.smtp.mailtrap.io',
            port: 2525,
            auth: {
                user: 'api',
                pass: token
            }
        });
    }
    return {
        sendMail: async (options) => {
            console.warn('--- EMAIL CONSOLE LOGGER MOCK ---');
            console.warn(`To: ${options.to}`);
            console.warn(`Subject: ${options.subject}`);
            console.warn(`Body:\n${options.text || options.html}`);
            console.warn('---------------------------------');
            return { messageId: 'console_mock' };
        }
    };
};
exports.getTransporter = getTransporter;
const sendVerificationEmail = async (to, token) => {
    const transporter = (0, exports.getTransporter)();
    const verifyUrl = `http://localhost:5173/verify-email?token=${token}`;
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
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (to, token) => {
    const transporter = (0, exports.getTransporter)();
    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
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
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
