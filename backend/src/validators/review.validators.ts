import { body, param, query, ValidationChain } from 'express-validator';
import { CONSTANTS } from '../config/constants';

// ─── Create Review (public) ───────────────────────────────────────────────────

export const createReviewValidators: ValidationChain[] = [
  body('customerName')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('reviewText')
    .notEmpty()
    .withMessage('Review text is required')
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Review must be between 10 and 2000 characters'),

  // source is optional for public submissions — defaults to 'website' in the controller
  body('source')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(Object.values(CONSTANTS.REVIEW_SOURCES))
    .withMessage(
      `Source must be one of: ${Object.values(CONSTANTS.REVIEW_SOURCES).join(', ')}`
    ),

  body('sourceUrl')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Source URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Source URL must not exceed 500 characters'),

  body('reviewDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Review date must be a valid ISO date'),
];

// ─── Update Review (admin) ────────────────────────────────────────────────────

export const updateReviewValidators: ValidationChain[] = [
  body('isApproved')
    .optional()
    .isBoolean()
    .withMessage('isApproved must be a boolean'),

  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),

  body('customerName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('reviewText')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Review must be between 10 and 2000 characters'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('sourceUrl')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Source URL must be a valid URL'),
];

// ─── Query params (public + admin list) ──────────────────────────────────────

export const publicListQueryValidators: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),

  query('source')
    .optional()
    .isIn(Object.values(CONSTANTS.REVIEW_SOURCES))
    .withMessage('Invalid source filter'),
];

export const adminListQueryValidators: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),

  query('source')
    .optional()
    .isIn(Object.values(CONSTANTS.REVIEW_SOURCES))
    .withMessage('Invalid source filter'),

  query('isApproved')
    .optional()
    .isBoolean()
    .withMessage('isApproved must be true or false'),

  query('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be true or false'),
];

// ─── MongoDB ID param ─────────────────────────────────────────────────────────

export const mongoIdParamValidator: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid review ID format'),
];
