import { Router } from 'express';
import { listUsers, updateUserRole, listEventsForModeration, removeEventListing } from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);

router.get('/events', listEventsForModeration);
router.delete('/events/:id', removeEventListing);

export default router;
