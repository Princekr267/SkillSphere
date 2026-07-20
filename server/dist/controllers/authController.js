"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLogin = exports.verify2FACode = exports.disable2FA = exports.enable2FA = exports.generate2FA = exports.resetPassword = exports.forgotPassword = exports.verifyEmail = exports.getMe = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const google_auth_library_1 = require("google-auth-library");
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("../services/emailService");
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
/**
 * Generate JWT token for a user ID.
 */
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'skillsphere_secure_jwt_secret_key_2026', { expiresIn: '30d' });
};
/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, city, latitude, longitude, companyName, bio, } = req.body;
        // 1. Basic validation
        if (!name || !email || !password || !role || !city || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, email, password, role, city, latitude, longitude',
            });
        }
        // 2. Check if user already exists
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email',
            });
        }
        // 3. Hash password (explicitly done here so it is very easy to read and explain in code reviews)
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // 4. Construct location coordinates
        const location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)], // GeoJSON format requires [longitude, latitude]
            city,
        };
        // 5. Create user based on role
        const verificationToken = crypto_1.default.randomBytes(16).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours
        const userData = {
            name,
            email,
            password: hashedPassword,
            role,
            location,
            verificationToken,
            verificationTokenExpires,
            isVerified: false,
        };
        if (role === 'client') {
            userData.companyName = companyName || '';
            userData.bio = bio || '';
        }
        else if (role === 'freelancer') {
            userData.skills = [];
            userData.portfolio = [];
            userData.certifications = [];
        }
        const user = await User_1.default.create(userData);
        try {
            await (0, emailService_1.sendVerificationEmail)(user.email, verificationToken);
        }
        catch (emailErr) {
            console.error('Nodemailer verification email dispatch failed:', emailErr);
        }
        // 6. Generate Token and send response
        const token = generateToken(user._id.toString());
        // Do not send password back in response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            location: user.location,
            companyName: user.companyName,
            bio: user.bio,
            skills: user.skills,
            portfolio: user.portfolio,
            hourlyRate: user.hourlyRate,
            resumeUrl: user.resumeUrl,
            certifications: user.certifications,
            rating: user.rating,
            reviewCount: user.reviewCount,
            isVerified: user.isVerified,
            twoFactorEnabled: user.twoFactorEnabled,
        };
        res.status(201).json({
            success: true,
            token,
            user: userResponse,
        });
    }
    catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
exports.registerUser = registerUser;
/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        // 1. Validate fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            });
        }
        // 2. Find user by email and explicitly include password
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }
        // 3. Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }
        // 4. Check 2FA
        if (user.twoFactorEnabled) {
            const tempToken = jsonwebtoken_1.default.sign({ tempUserId: user._id.toString() }, process.env.JWT_SECRET || 'skillsphere_secure_jwt_secret_key_2026', { expiresIn: '5m' });
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                tempToken,
            });
        }
        // 5. Generate Token
        const token = generateToken(user._id.toString());
        res.status(200).json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                companyName: user.companyName,
                bio: user.bio,
                skills: user.skills,
                portfolio: user.portfolio,
                hourlyRate: user.hourlyRate,
                resumeUrl: user.resumeUrl,
                certifications: user.certifications,
                rating: user.rating,
                reviewCount: user.reviewCount,
                isVerified: user.isVerified,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        });
    }
    catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
exports.loginUser = loginUser;
/**
 * @desc    Get current logged in user details
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        // req.user was already fetched in protect middleware
        res.status(200).json({
            success: true,
            user: req.user,
        });
    }
    catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user details',
        });
    }
};
exports.getMe = getMe;
/**
 * @desc    Verify user email using token
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User_1.default.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() },
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is invalid or has expired.',
            });
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Email verified successfully! You can close this window.',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error during email verification.',
            error: error.message,
        });
    }
};
exports.verifyEmail = verifyEmail;
/**
 * @desc    Request password reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide email' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found with this email' });
        }
        const resetToken = crypto_1.default.randomBytes(16).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordTokenExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();
        try {
            await (0, emailService_1.sendPasswordResetEmail)(user.email, resetToken);
        }
        catch (emailErr) {
            console.error('Error sending reset email:', emailErr);
            return res.status(500).json({ success: false, message: 'Failed to send password reset email.' });
        }
        res.status(200).json({
            success: true,
            message: 'Password reset link sent to your email address.',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.forgotPassword = forgotPassword;
/**
 * @desc    Reset password using token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, message: 'Please provide new password' });
        }
        const user = await User_1.default.findOne({
            resetPasswordToken: token,
            resetPasswordTokenExpires: { $gt: new Date() },
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Password reset token is invalid or has expired.',
            });
        }
        // Hash new password
        const salt = await bcryptjs_1.default.genSalt(10);
        user.password = await bcryptjs_1.default.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpires = undefined;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Password reset successfully! You can now log in.',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.resetPassword = resetPassword;
/**
 * @desc    Generate 2FA secret & QR code
 * @route   POST /api/auth/2fa/generate
 * @access  Private
 */
const generate2FA = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorized' });
        const secret = speakeasy_1.default.generateSecret({
            name: `SkillSphere:${user.email}`,
        });
        user.twoFactorSecret = secret.base32;
        await user.save();
        const qrCodeUrl = await qrcode_1.default.toDataURL(secret.otpauth_url || '');
        res.status(200).json({
            success: true,
            qrCodeUrl,
            secret: secret.base32,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '2FA generation error', error: error.message });
    }
};
exports.generate2FA = generate2FA;
/**
 * @desc    Enable 2FA (Verifies first code input)
 * @route   POST /api/auth/2fa/enable
 * @access  Private
 */
const enable2FA = async (req, res) => {
    try {
        const user = req.user;
        const { code } = req.body;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorized' });
        if (!code)
            return res.status(400).json({ success: false, message: 'Please provide code' });
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFactorSecret || '',
            encoding: 'base32',
            token: code,
            window: 1, // allow +/- 30 seconds offset
        });
        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid 2FA code' });
        }
        user.twoFactorEnabled = true;
        await user.save();
        res.status(200).json({
            success: true,
            message: '2FA enabled successfully!',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '2FA enable error', error: error.message });
    }
};
exports.enable2FA = enable2FA;
/**
 * @desc    Disable 2FA
 * @route   POST /api/auth/2fa/disable
 * @access  Private
 */
const disable2FA = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Not authorized' });
        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        await user.save();
        res.status(200).json({
            success: true,
            message: '2FA disabled successfully!',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '2FA disable error', error: error.message });
    }
};
exports.disable2FA = disable2FA;
/**
 * @desc    Verify 2FA code during login stage
 * @route   POST /api/auth/2fa/verify
 * @access  Public (needs temporary JWT auth in request body or headers)
 */
const verify2FACode = async (req, res) => {
    try {
        const { code, tempToken } = req.body;
        if (!code || !tempToken) {
            return res.status(400).json({ success: false, message: 'Please provide code and temporary token' });
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(tempToken, process.env.JWT_SECRET || 'skillsphere_secure_jwt_secret_key_2026');
        }
        catch (jwtErr) {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
        }
        const user = await User_1.default.findById(decoded.tempUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFactorSecret || '',
            encoding: 'base32',
            token: code,
            window: 1,
        });
        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid 2FA code' });
        }
        // Auth succeeded! Return complete token
        const token = generateToken(user._id.toString());
        res.status(200).json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                companyName: user.companyName,
                bio: user.bio,
                skills: user.skills,
                portfolio: user.portfolio,
                hourlyRate: user.hourlyRate,
                resumeUrl: user.resumeUrl,
                certifications: user.certifications,
                rating: user.rating,
                reviewCount: user.reviewCount,
                isVerified: user.isVerified,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '2FA verification error', error: error.message });
    }
};
exports.verify2FACode = verify2FACode;
/**
 * @desc    Google Sign-In / Registration
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleLogin = async (req, res) => {
    try {
        const { credential, role } = req.body;
        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential is required' });
        }
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({ success: false, message: 'Invalid Google token payload' });
        }
        const { email, name, picture } = payload;
        let user = await User_1.default.findOne({ email });
        if (!user) {
            if (!role) {
                return res.status(200).json({
                    success: true,
                    registrationRequired: true,
                    email,
                    name,
                });
            }
            const { city, latitude, longitude } = req.body;
            const defaultCity = city || 'Mumbai';
            const defaultLat = latitude !== undefined ? parseFloat(latitude) : 19.076;
            const defaultLng = longitude !== undefined ? parseFloat(longitude) : 72.877;
            const location = {
                type: 'Point',
                coordinates: [defaultLng, defaultLat],
                city: defaultCity,
            };
            const userData = {
                name,
                email,
                role,
                location,
                avatar: picture,
                isVerified: true,
            };
            if (role === 'client') {
                userData.companyName = '';
                userData.bio = '';
            }
            else if (role === 'freelancer') {
                userData.skills = [];
                userData.portfolio = [];
                userData.certifications = [];
            }
            user = await User_1.default.create(userData);
        }
        if (user.twoFactorEnabled) {
            const tempToken = jsonwebtoken_1.default.sign({ tempUserId: user._id.toString() }, process.env.JWT_SECRET || 'skillsphere_secure_jwt_secret_key_2026', { expiresIn: '5m' });
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                tempToken,
            });
        }
        const token = generateToken(user._id.toString());
        res.status(200).json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                avatar: user.avatar,
                companyName: user.companyName,
                bio: user.bio,
                skills: user.skills,
                portfolio: user.portfolio,
                hourlyRate: user.hourlyRate,
                resumeUrl: user.resumeUrl,
                certifications: user.certifications,
                rating: user.rating,
                reviewCount: user.reviewCount,
                isVerified: user.isVerified,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        });
    }
    catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ success: false, message: 'Google Authentication failed', error: error.message });
    }
};
exports.googleLogin = googleLogin;
