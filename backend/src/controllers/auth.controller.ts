import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { ResponseUtil } from '../utils/response.util';
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getClearCookieOptions,
  parseJwtExpiryMs,
} from '../utils/cookie.util';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return secret;
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '4h';
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export const login = async (req: Request, res: Response): Promise<void> => {
  // 1. Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    ResponseUtil.error(
      res,
      'Validation failed',
      errors.array().map((e) => ({ field: e.type === 'field' ? (e as any).path : undefined, message: e.msg })),
      422
    );
    return;
  }

  const { email, password } = req.body as { email: string; password: string };

  try {
    // 2. Find user — must use findByEmail to get password hash (select:false)
    const user = await User.findByEmail(email);

    // 3. Generic error for wrong email OR wrong password (no user enumeration)
    if (!user) {
      ResponseUtil.unauthorized(res, 'Invalid email or password');
      return;
    }

    // 4. Compare password using bcrypt
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      ResponseUtil.unauthorized(res, 'Invalid email or password');
      return;
    }

    // 5. Verify account is active
    if (!user.isActive) {
      ResponseUtil.unauthorized(res, 'Your account has been deactivated. Please contact the administrator.');
      return;
    }

    // 6. Sign JWT — payload contains only necessary info, never the password
    const jwtSecret = getJwtSecret();
    const expiresIn = getJwtExpiresIn();

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn } as jwt.SignOptions
    );

    // 7. Set JWT in HttpOnly cookie — never in response body
    const expiresInMs = parseJwtExpiryMs(expiresIn);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(expiresInMs));

    // 8. Update lastLogin (non-blocking — failure doesn't affect login)
    User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch((err) => {
      console.error('⚠️  Failed to update lastLogin:', err);
    });

    // 9. Return public profile only — no token, no password
    const publicProfile = user.getPublicProfile();

    ResponseUtil.success(
      res,
      { user: publicProfile },
      'Login successful'
    );
  } catch (error) {
    console.error('❌ Login error:', error);
    ResponseUtil.serverError(res);
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export const logout = (_req: Request, res: Response): void => {
  // Clear the auth cookie — overwrite with expired empty value
  res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());

  ResponseUtil.success(res, null, 'Logged out successfully');
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

export const getMe = async (req: Request, res: Response): Promise<void> => {
  // req.user is populated by authMiddleware — id, email, role guaranteed
  if (!req.user) {
    ResponseUtil.unauthorized(res, 'Authentication required');
    return;
  }

  try {
    // Re-fetch from DB to ensure data is current (not stale JWT payload)
    const user = await User.findById(req.user.id);

    if (!user) {
      ResponseUtil.unauthorized(res, 'User no longer exists');
      return;
    }

    ResponseUtil.success(res, user.getPublicProfile(), 'User retrieved successfully');
  } catch (error) {
    console.error('❌ GetMe error:', error);
    ResponseUtil.serverError(res);
  }
};
