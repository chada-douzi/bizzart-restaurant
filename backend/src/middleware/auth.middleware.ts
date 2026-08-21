import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { ResponseUtil } from '../utils/response.util';
import { CONSTANTS } from '../config/constants';

// ─── JWT Payload ──────────────────────────────────────────────────────────────

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Extract token from cookie ONLY — no Authorization header accepted
  const token: string | undefined = req.cookies?.[CONSTANTS.JWT_COOKIE_NAME];

  if (!token) {
    ResponseUtil.unauthorized(res, 'Authentication required');
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      ResponseUtil.serverError(res, 'Server configuration error');
      return;
    }

    // 2. Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // 3. Fetch the user from DB to ensure they still exist and are active
    const user = await User.findById(decoded.id).select('+isActive');

    // 4. User must exist
    if (!user) {
      ResponseUtil.unauthorized(res, 'User no longer exists');
      return;
    }

    // 5. User must be active
    if (!user.isActive) {
      ResponseUtil.unauthorized(res, 'Account has been deactivated');
      return;
    }

    // 6. Attach minimal user info to request (never expose password)
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      ResponseUtil.unauthorized(res, 'Session expired, please log in again');
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      ResponseUtil.unauthorized(res, 'Invalid authentication token');
      return;
    }

    // Unexpected error
    console.error('❌ Auth middleware error:', error);
    ResponseUtil.serverError(res, 'Authentication error');
  }
};

// ─── Role Guard Middleware ────────────────────────────────────────────────────

/**
 * Generic role-based middleware factory.
 * Must be used AFTER authMiddleware.
 *
 * Usage: router.get('/route', authMiddleware, requireRole('admin'), handler)
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtil.unauthorized(res, 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role)) {
      ResponseUtil.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

// ─── Admin Middleware ─────────────────────────────────────────────────────────

/**
 * Convenience middleware: restricts access to admin role only.
 * Must be used AFTER authMiddleware.
 *
 * Usage: router.use(authMiddleware, adminMiddleware)
 *
 * This is the real backend protection for admin routes.
 * Angular guards (authGuard, adminGuard) are UX-only and cannot be trusted.
 */
export const adminMiddleware = requireRole(CONSTANTS.USER_ROLES.ADMIN);

/**
 * Convenience middleware: allows both admin and manager roles.
 * Must be used AFTER authMiddleware.
 */
export const adminOrManagerMiddleware = requireRole(
  CONSTANTS.USER_ROLES.ADMIN,
  CONSTANTS.USER_ROLES.MANAGER
);
