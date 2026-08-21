/**
 * PHOTO VALIDATION ROUTES
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * GET uniquement - aucune route POST/PUT/DELETE
 */

import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { 
  getItemsForValidation, 
  getAvailablePhotos 
} from '../controllers/photo-validation.controller';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Toutes les routes nécessitent l'authentification admin
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/photo-validation/items
// Retourne tous les 98 plats pour validation
router.get('/items', authMiddleware, adminMiddleware, getItemsForValidation);

// GET /api/photo-validation/available-photos
// Retourne l'inventaire complet des photos disponibles
router.get('/available-photos', authMiddleware, adminMiddleware, getAvailablePhotos);

export default router;
