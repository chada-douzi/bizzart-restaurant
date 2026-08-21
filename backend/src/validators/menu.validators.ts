import { body, param, query, ValidationChain } from 'express-validator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates a MultiLanguageText object: { fr (required), en?, ar? }
 */
const multiLangField = (field: string, label: string): ValidationChain[] => [
  body(`${field}.fr`)
    .notEmpty()
    .withMessage(`${label} in French is required`)
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage(`${label} (fr) must not exceed 200 characters`),

  body(`${field}.en`)
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage(`${label} (en) must not exceed 200 characters`),

  body(`${field}.ar`)
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage(`${label} (ar) must not exceed 200 characters`),
];

const multiLangDescriptionField = (field: string, label: string): ValidationChain[] => [
  body(`${field}.fr`)
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(`${label} (fr) must not exceed 1000 characters`),

  body(`${field}.en`)
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(`${label} (en) must not exceed 1000 characters`),

  body(`${field}.ar`)
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(`${label} (ar) must not exceed 1000 characters`),
];

// ─── Category Validators ──────────────────────────────────────────────────────

export const createCategoryValidators: ValidationChain[] = [
  ...multiLangField('name', 'Category name'),
  ...multiLangDescriptionField('description', 'Category description'),

  body('image')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export const updateCategoryValidators: ValidationChain[] = [
  body('name')
    .optional(),

  body('name.fr')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Category name in French cannot be empty')
    .isLength({ max: 200 }),

  body('name.en')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 }),

  body('name.ar')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 }),

  ...multiLangDescriptionField('description', 'Category description'),

  body('image')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// ─── MenuItem Validators ──────────────────────────────────────────────────────

export const createMenuItemValidators: ValidationChain[] = [
  body('category')
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ID'),

  ...multiLangField('name', 'Item name'),
  ...multiLangDescriptionField('description', 'Item description'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('image')
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('video')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Video must be a valid URL'),

  body('allergens')
    .optional()
    .isArray()
    .withMessage('Allergens must be an array'),

  body('allergens.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each allergen must be a non-empty string'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each tag must be a non-empty string'),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),

  body('preparationTime')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Preparation time must be at least 1 minute'),

  body('nutritionInfo')
    .optional({ nullable: true })
    .isObject()
    .withMessage('nutritionInfo must be an object'),

  body('nutritionInfo.calories')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Calories must be non-negative'),

  body('nutritionInfo.protein')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Protein must be non-negative'),

  body('nutritionInfo.carbs')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Carbs must be non-negative'),

  body('nutritionInfo.fat')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Fat must be non-negative'),
];

export const updateMenuItemValidators: ValidationChain[] = [
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ID'),

  body('name')
    .optional(),

  body('name.fr')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Item name in French cannot be empty')
    .isLength({ max: 200 }),

  body('name.en')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 }),

  body('name.ar')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 }),

  ...multiLangDescriptionField('description', 'Item description'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('video')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Video must be a valid URL'),

  body('allergens')
    .optional()
    .isArray()
    .withMessage('Allergens must be an array'),

  body('allergens.*')
    .optional()
    .isString()
    .trim()
    .notEmpty(),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .trim()
    .notEmpty(),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),

  body('preparationTime')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Preparation time must be at least 1 minute'),

  body('nutritionInfo')
    .optional({ nullable: true })
    .isObject()
    .withMessage('nutritionInfo must be an object'),

  body('nutritionInfo.calories')
    .optional({ nullable: true })
    .isFloat({ min: 0 }),

  body('nutritionInfo.protein')
    .optional({ nullable: true })
    .isFloat({ min: 0 }),

  body('nutritionInfo.carbs')
    .optional({ nullable: true })
    .isFloat({ min: 0 }),

  body('nutritionInfo.fat')
    .optional({ nullable: true })
    .isFloat({ min: 0 }),
];

// ─── Query param validators ───────────────────────────────────────────────────

export const getItemsQueryValidators: ValidationChain[] = [
  query('category')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Category must be a non-empty string (slug or ID)'),

  query('featured')
    .optional()
    .isBoolean()
    .withMessage('featured must be true or false'),

  query('available')
    .optional()
    .isBoolean()
    .withMessage('available must be true or false'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('limit must be between 1 and 200'),
];

export const mongoIdParamValidator: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
];

export const slugParamValidator: ValidationChain[] = [
  param('slug')
    .isString()
    .trim()
    .notEmpty()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Invalid slug format'),
];
