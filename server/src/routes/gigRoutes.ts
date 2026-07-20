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
  addMilestones,
  updateMilestone,
  addProgressLog,
  uploadMessageAttachment,
} from '../controllers/gigController';
import { getMessages, postMessage, getUnreadCount } from '../controllers/messageController';
import { upload } from '../middleware/upload';


const router = express.Router();

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/', getGigs);
router.get('/nearby', getNearbyGigs);

// ─── Protected — specific named paths BEFORE :id wildcard ────────────────────
router.get('/my', protect, getMyGigs);
router.get('/applications', protect, getMyApplications);
router.get('/messages/unread', protect, getUnreadCount);
router.post('/messages/upload', protect, upload.single('attachment'), uploadMessageAttachment);

// ─── Protected — single gig by ID ────────────────────────────────────────────
router.get('/:id', getGigById);
router.put('/:id', protect, updateGig);
router.delete('/:id', protect, deleteGig);
router.post('/:id/apply', protect, applyToGig);
router.put('/:id/applicants/:applicantId', protect, updateApplicantStatus);
router.put('/:id/release', protect, releaseEscrow);
router.post('/:id/milestones', protect, addMilestones);
router.put('/:id/milestones/:milestoneId', protect, upload.single('deliverable'), updateMilestone);
router.post('/:id/progress-logs', protect, addProgressLog);

// ─── Messages ─────────────────────────────────────────────────────────────────
router.get('/:id/messages', protect, getMessages);
router.post('/:id/messages', protect, postMessage);

// ─── Protected — create ───────────────────────────────────────────────────────
import { gigPostLimiter } from '../middleware/rateLimiter';
router.post('/', protect, gigPostLimiter, createGig);


export default router;
