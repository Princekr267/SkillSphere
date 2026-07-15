"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
/**
 * Protect routes middleware - verifies JWT token in request headers.
 */
const protect = async (req, res, next) => {
    let token;
    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'skillsphere_secure_jwt_secret_key_2026');
            // Get user from the token, excluding the password field
            req.user = await User_1.default.findById(decoded.id);
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
            }
            next();
        }
        catch (error) {
            console.error('JWT Token Verification Error:', error);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
};
exports.protect = protect;
/**
 * Role authorization middleware - checks if the user has the required role.
 * @param roles Array of allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`,
            });
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Shorthand middleware that restricts access to admin role only.
 */
exports.adminOnly = (0, exports.authorize)('admin');
