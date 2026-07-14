import express from 'express';
import { updateUserProfile, uploadResume, uploadAvatar, getUserById, deleteAvatar, deleteResume } from '../controllers/userController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = express.Router();

// Profile updates & queries
router.put('/profile', protect, updateUserProfile);
router.get('/:id', protect, getUserById);

// File uploads
router.post('/upload-resume', protect, upload.single('resume'), uploadResume);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

// File removals
router.delete('/avatar', protect, deleteAvatar);
router.delete('/resume', protect, deleteResume);


export default router;
