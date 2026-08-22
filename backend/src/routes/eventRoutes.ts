import { Router } from 'express';
import { createEvent, listEvents, getEvent, getSeatMap, eventRevenue } from '../controllers/eventController';
import { postHoldSeats, deleteHoldSeat } from '../controllers/seatHoldController';
import { postBooking } from '../controllers/bookingController';
import { postJoinWaitlist } from '../controllers/waitlistController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, authorize('ORGANISER', 'ADMIN'), createEvent);
router.get('/', listEvents);
router.get('/:id', getEvent);
router.get('/:id/seatmap', getSeatMap);
router.get('/:id/revenue', authenticate, authorize('ORGANISER', 'ADMIN'), eventRevenue);

router.post('/:eventId/holds', authenticate, authorize('CUSTOMER'), postHoldSeats);
router.delete('/:eventId/holds/:seatId', authenticate, authorize('CUSTOMER'), deleteHoldSeat);

router.post('/:eventId/bookings', authenticate, authorize('CUSTOMER'), postBooking);

router.post('/:eventId/waitlist', authenticate, authorize('CUSTOMER'), postJoinWaitlist);

export default router;
