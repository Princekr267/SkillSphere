import express from 'express';
import { protect } from '../middleware/auth';
import {
  getRecommendedFreelancers,
  getTrendingSkills,
} from '../controllers/aiController';

const router = express.Router();

router.get('/recommend/:gigId', protect, getRecommendedFreelancers);
router.get('/trending-skills', getTrendingSkills);

export default router;
