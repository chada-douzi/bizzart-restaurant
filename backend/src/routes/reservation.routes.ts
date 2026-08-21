import { Router } from 'express';
import {
  createReservation,
  getReservationById,
  adminGetReservations,
  adminGetReservationById,
  updateReservationStatus,
  adminDeleteReservation,
} from '../controllers/reservation.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import {
  createReservationValidators,
  updateStatusValidators,
  adminListQueryValidators,
  mongoIdParamValidator,
} from '../validators/reservation.validators';

const router = Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// POST /api/reservations — create a reservation (public)
router.post('/', createReservationValidators, createReservation);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
// All require: valid JWT cookie + admin role
// IMPORTANT: admin routes are declared BEFORE /:id to prevent Express matching
// '/admin' as an id parameter

// GET /api/reservations/admin — list all reservations (with filters)
router.get('/admin', authMiddleware, adminMiddleware, adminListQueryValidators, adminGetReservations);

// GET /api/reservations/admin/:id — get full reservation details
router.get('/admin/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, adminGetReservationById);

// PUT /api/reservations/admin/:id/status — update status + append to statusHistory
router.put('/admin/:id/status', authMiddleware, adminMiddleware, mongoIdParamValidator, updateStatusValidators, updateReservationStatus);

// DELETE /api/reservations/admin/:id — delete (only cancelled/rejected/completed)
router.delete('/admin/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, adminDeleteReservation);

// GET /api/reservations/:id — check own reservation status (public)
// IMPORTANT: declared AFTER admin routes so '/admin' is not matched here
router.get('/:id', mongoIdParamValidator, getReservationById);

export default router;
