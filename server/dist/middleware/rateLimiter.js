"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.twoFactorLimiter = exports.sensitiveActionLimiter = exports.gigPostLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Limit to max 5 requests per 15 minutes on auth routes (failed/total attempts)
exports.authLimiter = (0, express_rate_limit_1.default)({
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
exports.gigPostLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        message: 'Gig posting limit exceeded (max 10 posts per hour). Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Limit registration and password-reset requests to prevent abuse / account enumeration
exports.sensitiveActionLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Strict limiter for 2FA verification — a 6-digit TOTP is brute-forceable in minutes without throttling
exports.twoFactorLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many 2FA attempts from this IP, please try again after 10 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
