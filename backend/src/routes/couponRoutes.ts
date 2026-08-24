import { Router } from 'express';
import { validateCoupon, listCoupons, createCoupon, deactivateCoupon } from '../controllers/couponController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/validate', authenticate, validateCoupon);

router.get('/', authenticate, authorize('ADMIN'), listCoupons);
router.post('/', authenticate, authorize('ADMIN'), createCoupon);
router.patch('/:id/deactivate', authenticate, authorize('ADMIN'), deactivateCoupon);

export default router;
