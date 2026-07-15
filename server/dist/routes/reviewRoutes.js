"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const reviewController_1 = require("../controllers/reviewController");
const router = express_1.default.Router();
router.post('/', auth_1.protect, reviewController_1.createReview);
router.get('/user/:userId', reviewController_1.getReviewsForUser);
router.get('/check/:gigId', auth_1.protect, reviewController_1.checkReviewed);
exports.default = router;
