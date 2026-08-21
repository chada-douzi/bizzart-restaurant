import { Router } from 'express';
import {
  // Public
  getCategories,
  getCategoryBySlug,
  getItems,
  getItemBySlug,
  // Admin — categories
  adminGetCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // Admin — items
  adminGetItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menu.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import {
  createCategoryValidators,
  updateCategoryValidators,
  createMenuItemValidators,
  updateMenuItemValidators,
  getItemsQueryValidators,
  mongoIdParamValidator,
  slugParamValidator,
} from '../validators/menu.validators';

const router = Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
// No authentication required

// GET /api/menu/categories
router.get('/categories', getCategories);

// GET /api/menu/categories/:slug
router.get('/categories/:slug', slugParamValidator, getCategoryBySlug);

// GET /api/menu/items
router.get('/items', getItemsQueryValidators, getItems);

// GET /api/menu/items/:slug
router.get('/items/:slug', slugParamValidator, getItemBySlug);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
// All admin routes require: valid JWT cookie (authMiddleware) + admin role (adminMiddleware)

// GET /api/menu/admin/categories
router.get('/admin/categories', authMiddleware, adminMiddleware, adminGetCategories);

// POST /api/menu/admin/categories
router.post('/admin/categories', authMiddleware, adminMiddleware, createCategoryValidators, createCategory);

// PUT /api/menu/admin/categories/:id
router.put('/admin/categories/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, updateCategoryValidators, updateCategory);

// DELETE /api/menu/admin/categories/:id
router.delete('/admin/categories/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, deleteCategory);

// GET /api/menu/admin/items
router.get('/admin/items', authMiddleware, adminMiddleware, adminGetItems);

// POST /api/menu/admin/items
router.post('/admin/items', authMiddleware, adminMiddleware, createMenuItemValidators, createMenuItem);

// PUT /api/menu/admin/items/:id
router.put('/admin/items/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, updateMenuItemValidators, updateMenuItem);

// DELETE /api/menu/admin/items/:id
router.delete('/admin/items/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, deleteMenuItem);

export default router;
