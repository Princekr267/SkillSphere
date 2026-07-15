import express from 'express';
import { protect } from '../middleware/auth';
import {
  createOrder,
  verifyPayment,
  releasePayment,
  refundPayment,
  getTransactionHistory,
} from '../controllers/paymentController';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.put('/release/:gigId', protect, releasePayment);
router.put('/refund/:gigId', protect, refundPayment);
router.get('/history', protect, getTransactionHistory);

export default router;
