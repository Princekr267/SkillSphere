import express from 'express';
import { protect } from '../middleware/auth';
import {
  createProposal,
  getProposalsForGig,
  respondToProposal,
} from '../controllers/proposalController';

const router = express.Router();

router.post('/gig/:id', protect, createProposal);
router.get('/gig/:id', protect, getProposalsForGig);
router.put('/:proposalId/respond', protect, respondToProposal);

export default router;
