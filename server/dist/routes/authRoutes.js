"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = express_1.default.Router();
// Public auth routes
router.post('/register', authController_1.registerUser);
router.post('/login', rateLimiter_1.authLimiter, authController_1.loginUser);
router.get('/verify-email/:token', authController_1.verifyEmail);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password/:token', authController_1.resetPassword);
router.post('/google', authController_1.googleLogin);
router.post('/2fa/verify', authController_1.verify2FACode);
// Protected profile & 2FA management routes
router.get('/me', auth_1.protect, authController_1.getMe);
router.post('/2fa/generate', auth_1.protect, authController_1.generate2FA);
router.post('/2fa/enable', auth_1.protect, authController_1.enable2FA);
router.post('/2fa/disable', auth_1.protect, authController_1.disable2FA);
exports.default = router;
