import { body, ValidationChain } from 'express-validator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const multiLangOptional = (field: string): ValidationChain[] => [
  body(`${field}.fr`)
    .optional({ nullable: true })
    .isString().trim()
    .isLength({ max: 500 })
    .withMessage(`${field}.fr must not exceed 500 characters`),
  body(`${field}.en`)
    .optional({ nullable: true })
    .isString().trim()
    .isLength({ max: 500 }),
  body(`${field}.ar`)
    .optional({ nullable: true })
    .isString().trim()
    .isLength({ max: 500 }),
];

// ─── Update Settings (admin) — all fields optional (partial update via upsert) ──

export const updateSettingsValidators: ValidationChain[] = [
  // Restaurant name
  body('restaurantName')
    .optional()
    .isString().trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Restaurant name must be between 1 and 100 characters'),

  // Description (multilang)
  ...multiLangOptional('description'),

  // Contact — phone
  body('contact.phone')
    .optional({ nullable: true })
    .isString().trim()
    .isLength({ max: 30 })
    .withMessage('Phone must not exceed 30 characters'),

  // Contact — email
  body('contact.email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('Contact email must be a valid email address')
    .isLength({ max: 100 }),

  // Contact — address
  body('contact.address.street')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 200 }),
  body('contact.address.city')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 100 }),
  body('contact.address.postalCode')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 20 }),
  body('contact.address.country')
    .optional({ nullable: true })
    .isString().trim().isLength({ max: 100 }),

  // Contact — coordinates
  body('contact.coordinates.lat')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('contact.coordinates.lng')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  // Opening hours
  body('openingHours')
    .optional()
    .isArray()
    .withMessage('openingHours must be an array'),
  body('openingHours.*.day')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Each opening hours entry must have a valid day'),
  body('openingHours.*.isOpen')
    .optional()
    .isBoolean()
    .withMessage('isOpen must be a boolean'),
  body('openingHours.*.slots')
    .optional()
    .isArray()
    .withMessage('slots must be an array'),
  body('openingHours.*.slots.*.open')
    .optional()
    .matches(timeRegex)
    .withMessage('Slot open time must be in HH:MM format'),
  body('openingHours.*.slots.*.close')
    .optional()
    .matches(timeRegex)
    .withMessage('Slot close time must be in HH:MM format'),

  // Social media
  body('socialMedia.instagram')
    .optional({ nullable: true })
    .isURL().withMessage('Instagram must be a valid URL')
    .isLength({ max: 300 }),
  body('socialMedia.facebook')
    .optional({ nullable: true })
    .isURL().withMessage('Facebook must be a valid URL')
    .isLength({ max: 300 }),
  body('socialMedia.tiktok')
    .optional({ nullable: true })
    .isURL().withMessage('TikTok must be a valid URL')
    .isLength({ max: 300 }),

  // Reservation settings
  body('reservationSettings.maxGuestsPerReservation')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('maxGuestsPerReservation must be between 1 and 100'),
  body('reservationSettings.minGuestsPerReservation')
    .optional()
    .isInt({ min: 1 })
    .withMessage('minGuestsPerReservation must be at least 1'),
  body('reservationSettings.maxDailyReservations')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxDailyReservations must be at least 1'),
  body('reservationSettings.advanceBookingDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('advanceBookingDays must be between 1 and 365'),
  body('reservationSettings.timeSlotDuration')
    .optional()
    .isInt({ min: 15, max: 120 })
    .withMessage('timeSlotDuration must be between 15 and 120 minutes'),
  body('reservationSettings.autoConfirm')
    .optional()
    .isBoolean()
    .withMessage('autoConfirm must be a boolean'),

  // SEO
  ...multiLangOptional('seo.metaTitle'),
  ...multiLangOptional('seo.metaDescription'),
  body('seo.keywords')
    .optional()
    .isArray()
    .withMessage('keywords must be an array'),
  body('seo.keywords.*')
    .optional()
    .isString().trim().notEmpty()
    .withMessage('Each keyword must be a non-empty string'),

  // Branding
  body('branding.logo')
    .optional({ nullable: true })
    .isURL().withMessage('Logo must be a valid URL')
    .isLength({ max: 500 }),
  body('branding.favicon')
    .optional({ nullable: true })
    .isURL().withMessage('Favicon must be a valid URL')
    .isLength({ max: 500 }),
  body('branding.primaryColor')
    .optional({ nullable: true })
    .matches(hexColorRegex)
    .withMessage('primaryColor must be a valid hex color (e.g. #b59164)'),
  body('branding.secondaryColor')
    .optional({ nullable: true })
    .matches(hexColorRegex)
    .withMessage('secondaryColor must be a valid hex color'),
];
