import express from 'express';
import {
  updateUserProfile,
  uploadAvatar,
  getUserById,
  deleteAvatar,
  updateAvailability,
  getFreelancerAnalytics,
  uploadResume,
  deleteResume,
} from '../controllers/userController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

// Profile updates & queries
router.put('/profile', protect, updateUserProfile);
router.put('/profile/availability', protect, updateAvailability);
router.get('/freelancer/analytics', protect, getFreelancerAnalytics);
router.get('/:id', protect, getUserById);

// File uploads
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/resume', protect, upload.single('resume'), uploadResume);

// File removals
router.delete('/avatar', protect, deleteAvatar);
router.delete('/resume', protect, deleteResume);

export default router;
