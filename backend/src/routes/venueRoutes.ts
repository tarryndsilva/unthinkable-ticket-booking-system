import { Router } from 'express';
import { createVenue, listVenues, getVenue } from '../controllers/venueController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, authorize('ADMIN'), createVenue);
router.get('/', authenticate, listVenues);
router.get('/:id', authenticate, getVenue);

export default router;
