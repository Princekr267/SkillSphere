import express from 'express';
import { protect } from '../middleware/auth';
import {
  getRecommendedFreelancers,
  getTrendingSkills,
  draftProposalCoverLetter,
} from '../controllers/aiController';

const router = express.Router();

router.get('/recommend/:gigId', protect, getRecommendedFreelancers);
router.get('/trending-skills', getTrendingSkills);
router.post('/draft-proposal', protect, draftProposalCoverLetter);

export default router;
