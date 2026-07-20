"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// All admin routes require auth + admin role
router.use(auth_1.protect, auth_1.adminOnly);
router.get('/stats', adminController_1.getStats);
router.get('/users', adminController_1.getAllUsers);
router.put('/users/:id/status', adminController_1.toggleUserStatus);
router.get('/gigs', adminController_1.getAllGigsAdmin);
router.delete('/gigs/:id', adminController_1.adminDeleteGig);
router.get('/flagged-reviews', adminController_1.getFlaggedReviews);
router.put('/reviews/:id/dismiss', adminController_1.dismissReviewFlag);
router.delete('/reviews/:id', adminController_1.deleteReview);
router.get('/warnings', adminController_1.getWarnings);
exports.default = router;
