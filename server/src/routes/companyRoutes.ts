import express from 'express';
import { protect } from '../middleware/auth';
import {
  registerCompany,
  getMyCompanies,
  getCompanyDetails,
  getCompanyMembers,
  regenerateInviteKey,
  joinCompanyByInviteKey,
  getCompanyGigs,
  resubmitCompany,
} from '../controllers/companyController';

const router = express.Router();

// All company routes require authentication
router.use(protect);

// ─── Self-service routes ──────────────────────────────────────────────────────
router.post('/register',                 registerCompany);
router.get('/mine',                      getMyCompanies);
router.post('/join',                     joinCompanyByInviteKey);
router.get('/:id',                       getCompanyDetails);
router.get('/:id/members',              getCompanyMembers);
router.get('/:id/gigs',                 getCompanyGigs);
router.post('/:id/regenerate-key',      regenerateInviteKey);
router.put('/:id/resubmit',             resubmitCompany);

export default router;
