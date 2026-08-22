import express from 'express';
import { protect } from '../middleware/auth';
import {
  getUnreadCount,
  getUnreadConversations,
  markGigMessagesAsRead,
} from '../controllers/messageController';

const router = express.Router();

router.get('/unread', protect, getUnreadCount);
router.get('/unread/conversations', protect, getUnreadConversations);
router.put('/gig/:gigId/read', protect, markGigMessagesAsRead);

export default router;
