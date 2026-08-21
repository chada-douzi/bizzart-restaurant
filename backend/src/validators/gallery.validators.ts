import { body, param, query, ValidationChain } from 'express-validator';
import { CONSTANTS } from '../config/constants';

const MEDIA_TYPES     = Object.values(CONSTANTS.MEDIA_TYPES);
const MEDIA_CATEGORIES = Object.values(CONSTANTS.MEDIA_CATEGORIES);

// ─── Create/Update media metadata ────────────────────────────────────────────

export const createMediaValidators: ValidationChain[] = [
  body('type')
    .notEmpty().withMessage('Media type is required')
    .isIn(MEDIA_TYPES).withMessage(`type must be one of: ${MEDIA_TYPES.join(', ')}`),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(MEDIA_CATEGORIES).withMessage(`category must be one of: ${MEDIA_CATEGORIES.join(', ')}`),

  body('url')
    .notEmpty().withMessage('URL is required')
    .isURL().withMessage('url must be a valid URL'),

  body('publicId')
    .notEmpty().withMessage('Cloudinary publicId is required')
    .isString().trim(),

  body('title')
    .optional({ nullable: true })
    .isString().trim()
    .isLength({ max: 200 }).withMessage('title must not exceed 200 characters'),

  body('altText')
    .optional({ nullable: true })
    .isString().trim()
    .isLength({ max: 300 }).withMessage('altText must not exceed 300 characters'),

  body('isVisible')
    .optional()
    .isBoolean().withMessage('isVisible must be a boolean'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('order must be a non-negative integer'),

  body('thumbnailUrl')
    .optional({ nullable: true })
    .isURL().withMessage('thumbnailUrl must be a valid URL'),
];

export const updateMediaValidators: ValidationChain[] = [
  body('category')
    .optional()
    .isIn(MEDIA_CATEGORIES).withMessage(`category must be one of: ${MEDIA_CATEGORIES.join(', ')}`),

  body('title')
    .optional({ nullable: true })
    .isString().trim()
    .isLength({ max: 200 }).withMessage('title must not exceed 200 characters'),

  body('altText')
    .optional({ nullable: true })
    .isString().trim()
    .isLength({ max: 300 }).withMessage('altText must not exceed 300 characters'),

  body('isVisible')
    .optional()
    .isBoolean().withMessage('isVisible must be a boolean'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('order must be a non-negative integer'),
];

// ─── Query params (public list) ───────────────────────────────────────────────

export const publicGalleryQueryValidators: ValidationChain[] = [
  query('category')
    .optional()
    .isIn(MEDIA_CATEGORIES).withMessage('Invalid category filter'),

  query('type')
    .optional()
    .isIn(MEDIA_TYPES).withMessage('Invalid type filter'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

// ─── MongoDB ID param ─────────────────────────────────────────────────────────

export const mongoIdParamValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid media ID format'),
];
