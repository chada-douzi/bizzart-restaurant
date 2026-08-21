import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createReview,
  getPublicReviews,
  getReviewStats,
  getPublicReviewById,
  adminGetReviews,
  adminGetReviewById,
  adminUpdateReview,
  adminDeleteReview,
} from '../controllers/review.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import {
  createReviewValidators,
  updateReviewValidators,
  publicListQueryValidators,
  adminListQueryValidators,
  mongoIdParamValidator,
} from '../validators/review.validators';

const router = Router();

// ─── Rate limiter — public review submission ──────────────────────────────────
// Allows genuine customers to submit reviews while preventing spam.
// Limit: 10 submissions per hour per IP (more lenient than login — reviews are
// a normal customer action, not a security-sensitive one).
const reviewRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 10,                      // max 10 review submissions per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many review submissions. Please try again in an hour.',
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// POST /api/reviews — submit a review (pending moderation, rate-limited)
router.post('/', reviewRateLimiter, createReviewValidators, createReview);

// GET /api/reviews/stats — rating stats (aggregate, approved+published only)
// IMPORTANT: declared BEFORE /:id to avoid Express matching 'stats' as an ID
router.get('/stats', getReviewStats);

// GET /api/reviews/admin — all reviews for admin
// IMPORTANT: declared BEFORE /:id to avoid Express matching 'admin' as an ID
router.get('/admin', authMiddleware, adminMiddleware, adminListQueryValidators, adminGetReviews);

// GET /api/reviews/admin/:id
router.get('/admin/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, adminGetReviewById);

// PUT /api/reviews/admin/:id — approve, publish, reject, edit
router.put('/admin/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, updateReviewValidators, adminUpdateReview);

// DELETE /api/reviews/admin/:id
router.delete('/admin/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, adminDeleteReview);

// GET /api/reviews — public list (approved+published only)
router.get('/', publicListQueryValidators, getPublicReviews);

// GET /api/reviews/:id — single public review
// IMPORTANT: declared LAST to avoid matching 'stats' or 'admin'
router.get('/:id', mongoIdParamValidator, getPublicReviewById);

export default router;
