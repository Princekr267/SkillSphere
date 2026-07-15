import express from 'express';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  raiseDispute,
  getDisputes,
  resolveDispute,
} from '../controllers/disputeController';

const router = express.Router();

router.post('/', protect, upload.single('evidence'), raiseDispute);
router.get('/', protect, getDisputes);
router.put('/:id/resolve', protect, resolveDispute);

export default router;
