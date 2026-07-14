import express from 'express';
import { protect } from '../middleware/auth';
import { createReview, getReviewsForUser, checkReviewed } from '../controllers/reviewController';

const router = express.Router();

router.post('/', protect, createReview);
router.get('/user/:userId', getReviewsForUser);
router.get('/check/:gigId', protect, checkReviewed);

export default router;
