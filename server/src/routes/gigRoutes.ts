import express from 'express';
import { protect } from '../middleware/auth';
import {
  createGig,
  getGigs,
  getNearbyGigs,
  getGigById,
  getMyGigs,
  getMyApplications,
  updateGig,
  deleteGig,
  applyToGig,
  updateApplicantStatus,
  releaseEscrow,
} from '../controllers/gigController';
import { getMessages, postMessage } from '../controllers/messageController';


const router = express.Router();

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/', getGigs);
router.get('/nearby', getNearbyGigs);

// ─── Protected — specific named paths BEFORE :id wildcard ────────────────────
router.get('/my', protect, getMyGigs);
router.get('/applications', protect, getMyApplications);

// ─── Protected — single gig by ID ────────────────────────────────────────────
router.get('/:id', getGigById);
router.put('/:id', protect, updateGig);
router.delete('/:id', protect, deleteGig);
router.post('/:id/apply', protect, applyToGig);
router.put('/:id/applicants/:applicantId', protect, updateApplicantStatus);
router.put('/:id/release', protect, releaseEscrow);

// ─── Messages ─────────────────────────────────────────────────────────────────
router.get('/:id/messages', protect, getMessages);
router.post('/:id/messages', protect, postMessage);

// ─── Protected — create ───────────────────────────────────────────────────────
router.post('/', protect, createGig);


export default router;
