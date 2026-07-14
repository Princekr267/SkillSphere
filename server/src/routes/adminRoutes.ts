import express from 'express';
import { protect, adminOnly } from '../middleware/auth';
import { getStats, getAllUsers, toggleUserStatus, getAllGigsAdmin, adminDeleteGig } from '../controllers/adminController';

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get('/stats',              getStats);
router.get('/users',              getAllUsers);
router.put('/users/:id/status',   toggleUserStatus);
router.get('/gigs',               getAllGigsAdmin);
router.delete('/gigs/:id',        adminDeleteGig);

export default router;
