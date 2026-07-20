import express from 'express';
import { protect } from '../middleware/auth';
import {
  createBooking,
  getBookings,
  updateBookingStatus,
} from '../controllers/bookingController';

const router = express.Router();

router.use(protect);

router.post('/', createBooking);
router.get('/', getBookings);
router.put('/:id/status', updateBookingStatus);
router.put('/:id/respond', updateBookingStatus);

export default router;
