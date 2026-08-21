import { Router } from 'express';
import {
  getPublicSettings,
  adminGetSettings,
  adminUpdateSettings,
} from '../controllers/settings.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { updateSettingsValidators } from '../validators/settings.validators';

const router = Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// GET /api/settings — public subset (no sensitive data, no reservationSettings)
router.get('/', getPublicSettings);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
// IMPORTANT: /admin declared BEFORE any /:param routes to avoid Express conflicts

// GET /api/settings/admin — full settings
router.get('/admin', authMiddleware, adminMiddleware, adminGetSettings);

// PUT /api/settings/admin — upsert singleton
router.put('/admin', authMiddleware, adminMiddleware, updateSettingsValidators, adminUpdateSettings);

export default router;
