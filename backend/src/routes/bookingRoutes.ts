import { Router } from 'express';
import { getMyBookings, getBookingById, deleteBooking } from '../controllers/bookingController';
import { getMyWaitlist } from '../controllers/waitlistController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getMyBookings);
router.get('/waitlist/mine', authenticate, getMyWaitlist);
router.get('/:id', authenticate, getBookingById);
router.delete('/:id', authenticate, deleteBooking);

export default router;
