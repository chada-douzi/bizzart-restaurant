import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { loginValidators } from '../validators/auth.validators';
import { CONSTANTS } from '../config/constants';

const router = Router();

// ─── Rate limiter — login endpoint only ──────────────────────────────────────

const loginRateLimiter = rateLimit({
  windowMs: CONSTANTS.LOGIN_RATE_WINDOW,  // 15 minutes
  max: CONSTANTS.LOGIN_RATE_LIMIT,        // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,           // Only count failed attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/login — public, rate-limited, validated
router.post('/login', loginRateLimiter, loginValidators, login);

// POST /api/auth/logout — clears cookie (no auth required: clearing an absent cookie is harmless)
router.post('/logout', logout);

// GET /api/auth/me — protected: requires valid JWT cookie
router.get('/me', authMiddleware, getMe);

export default router;
