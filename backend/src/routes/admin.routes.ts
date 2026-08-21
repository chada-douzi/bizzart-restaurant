import { Router } from 'express';
import { getAdminStats } from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET /api/admin/stats — aggregated dashboard statistics (admin only)
router.get('/stats', authMiddleware, adminMiddleware, getAdminStats);

export default router;
