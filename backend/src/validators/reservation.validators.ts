import { body, param, query, ValidationChain } from 'express-validator';
import { CONSTANTS } from '../config/constants';

// ─── Create Reservation (public) ──────────────────────────────────────────────

export const createReservationValidators: ValidationChain[] = [
  // Customer — firstName
  body('customer.firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  // Customer — lastName
  body('customer.lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  // Customer — email
  body('customer.email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters'),

  // Customer — phone (flexible: accepts international formats)
  body('customer.phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isString()
    .trim()
    .matches(/^\+?[\d\s\-().]{7,20}$/)
    .withMessage('Please provide a valid phone number (7–20 digits)'),

  // Date — must be a valid ISO date string and not in the past
  body('date')
    .notEmpty()
    .withMessage('Reservation date is required')
    .isISO8601()
    .withMessage('Date must be a valid date (YYYY-MM-DD)')
    .custom((value: string) => {
      const inputDate = new Date(value);
      const today = new Date();
      // Compare date only (strip time component)
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);
      if (inputDate < today) {
        throw new Error('Reservation date cannot be in the past');
      }
      // Check advance booking limit
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + CONSTANTS.ADVANCE_BOOKING_DAYS);
      maxDate.setHours(23, 59, 59, 999);
      if (inputDate > maxDate) {
        throw new Error(
          `Reservations can only be made up to ${CONSTANTS.ADVANCE_BOOKING_DAYS} days in advance`
        );
      }
      return true;
    }),

  // Time — strict HH:MM format
  body('time')
    .notEmpty()
    .withMessage('Reservation time is required')
    .isString()
    .trim()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Time must be in HH:MM format (e.g. 19:30)'),

  // Guests — use constants, no hardcoded values
  body('guests')
    .notEmpty()
    .withMessage('Number of guests is required')
    .isInt({
      min: CONSTANTS.MIN_GUESTS_PER_RESERVATION,
      max: CONSTANTS.MAX_GUESTS_PER_RESERVATION,
    })
    .withMessage(
      `Number of guests must be between ${CONSTANTS.MIN_GUESTS_PER_RESERVATION} and ${CONSTANTS.MAX_GUESTS_PER_RESERVATION}`
    ),

  // Special request — optional, length-limited to prevent abuse
  body('specialRequest')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Special request must not exceed 1000 characters'),
];

// ─── Update Status (admin) ────────────────────────────────────────────────────

export const updateStatusValidators: ValidationChain[] = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(CONSTANTS.RESERVATION_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(CONSTANTS.RESERVATION_STATUS).join(', ')}`
    ),

  body('note')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note must not exceed 500 characters'),

  body('tableNumber')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Table number must not exceed 20 characters'),
];

// ─── Query params (admin list) ────────────────────────────────────────────────

export const adminListQueryValidators: ValidationChain[] = [
  query('status')
    .optional()
    .isIn(Object.values(CONSTANTS.RESERVATION_STATUS))
    .withMessage('Invalid status filter'),

  query('date')
    .optional()
    .isISO8601()
    .withMessage('date filter must be a valid ISO date'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

// ─── MongoDB ID param ─────────────────────────────────────────────────────────

export const mongoIdParamValidator: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid reservation ID format'),
];
