import express from 'express';
import { protect, adminOnly } from '../middleware/auth';
import {
  getStats,
  getAllUsers,
  toggleUserStatus,
  getAllGigsAdmin,
  adminDeleteGig,
  getFlaggedReviews,
  dismissReviewFlag,
  deleteReview,
  getWarnings,
  getPendingCompanies,
  approveCompany,
  rejectCompany,
} from '../controllers/adminController';

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get('/stats',              getStats);
router.get('/users',              getAllUsers);
router.put('/users/:id/status',   toggleUserStatus);
router.get('/gigs',               getAllGigsAdmin);
router.delete('/gigs/:id',        adminDeleteGig);
router.get('/flagged-reviews',     getFlaggedReviews);
router.put('/reviews/:id/dismiss', dismissReviewFlag);
router.delete('/reviews/:id',      deleteReview);
router.get('/warnings',                     getWarnings);

// Company management routes
router.get('/companies/pending',            getPendingCompanies);
router.put('/companies/:id/approve',        approveCompany);
router.put('/companies/:id/reject',         rejectCompany);

export default router;
