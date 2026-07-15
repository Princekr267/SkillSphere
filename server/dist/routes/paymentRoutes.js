"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const paymentController_1 = require("../controllers/paymentController");
const router = express_1.default.Router();
router.post('/create-order', auth_1.protect, paymentController_1.createOrder);
router.post('/verify', auth_1.protect, paymentController_1.verifyPayment);
router.put('/release/:gigId', auth_1.protect, paymentController_1.releasePayment);
router.put('/refund/:gigId', auth_1.protect, paymentController_1.refundPayment);
router.get('/history', auth_1.protect, paymentController_1.getTransactionHistory);
exports.default = router;
