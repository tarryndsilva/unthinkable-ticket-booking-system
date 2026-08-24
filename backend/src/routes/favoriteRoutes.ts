import { Router } from 'express';
import { listMyFavorites, listMyFavoriteIds } from '../controllers/favoriteController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, listMyFavorites);
router.get('/ids', authenticate, listMyFavoriteIds);

export default router;
