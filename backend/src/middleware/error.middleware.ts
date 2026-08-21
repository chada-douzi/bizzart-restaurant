import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response.util';

export interface AppError extends Error {
  statusCode?: number;
  errors?: Array<{ field?: string; message: string }>;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  // Log error for debugging
  console.error('❌ Error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values((error as any).errors).map((err: any) => ({
      field: err.path,
      message: err.message,
    }));
    return ResponseUtil.error(res, 'Validation failed', errors, 400);
  }

  // Mongoose duplicate key error
  if ((error as any).code === 11000) {
    const field = Object.keys((error as any).keyValue)[0];
    return ResponseUtil.error(
      res,
      'Duplicate entry',
      [{ field, message: `${field} already exists` }],
      409
    );
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return ResponseUtil.unauthorized(res, 'Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return ResponseUtil.unauthorized(res, 'Token expired');
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Don't expose error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    return ResponseUtil.serverError(res);
  }

  return ResponseUtil.error(res, message, error.errors, statusCode);
};

export const notFoundHandler = (req: Request, res: Response): Response => {
  return ResponseUtil.notFound(res, `Route ${req.path} not found`);
};
