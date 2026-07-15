"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
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
        const userData = {
            name,
            email,
            password: hashedPassword,
            role,
            location,
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
        // 4. Generate Token
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
