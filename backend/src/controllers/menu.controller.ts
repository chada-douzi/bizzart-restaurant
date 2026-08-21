import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { MenuCategory } from '../models/menu-category.model';
import { MenuItem } from '../models/menu-item.model';
import { ResponseUtil } from '../utils/response.util';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    ResponseUtil.error(
      res,
      'Validation failed',
      errors.array().map((e) => ({
        field: e.type === 'field' ? (e as any).path : undefined,
        message: e.msg,
      })),
      422
    );
    return true;
  }
  return false;
}

/**
 * Generates a URL-safe slug from a string.
 * Example: "Poulet Rôti" → "poulet-roti"
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '-')             // spaces → hyphens
    .replace(/-+/g, '-');             // collapse multiple hyphens
}

/**
 * Ensures a generated slug is unique by appending a counter if needed.
 */
async function ensureUniqueSlug(
  base: string,
  model: 'category' | 'item',
  excludeId?: string
): Promise<string> {
  let slug = base;
  let counter = 1;

  while (true) {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) {
      filter['_id'] = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const existing =
      model === 'category'
        ? await MenuCategory.findOne(filter)
        : await MenuItem.findOne(filter);

    if (!existing) break;
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES — PUBLIC
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/menu/categories
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await MenuCategory.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    ResponseUtil.success(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    console.error('❌ getCategories error:', error);
    ResponseUtil.serverError(res);
  }
};

// GET /api/menu/categories/:slug
export const getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const category = await MenuCategory.findOne({
      slug: req.params.slug,
      isActive: true,
    }).lean();

    if (!category) {
      ResponseUtil.notFound(res, 'Category not found');
      return;
    }

    // Include items belonging to this category
    const items = await MenuItem.find({
      category: category._id,
      isAvailable: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    ResponseUtil.success(res, { ...category, items }, 'Category retrieved successfully');
  } catch (error) {
    console.error('❌ getCategoryBySlug error:', error);
    ResponseUtil.serverError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ITEMS — PUBLIC
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/menu/items
export const getItems = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const {
      category,
      featured,
      available,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};

    // Filter by availability (public routes always show available items by default)
    if (available !== undefined) {
      filter['isAvailable'] = available === 'true';
    } else {
      filter['isAvailable'] = true; // default: only available items on public routes
    }

    // Filter by featured
    if (featured !== undefined) {
      filter['isFeatured'] = featured === 'true';
    }

    // Filter by category (accepts slug or ObjectId)
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter['category'] = new mongoose.Types.ObjectId(category);
      } else {
        // Lookup by slug
        const cat = await MenuCategory.findOne({ slug: category, isActive: true }).select('_id');
        if (!cat) {
          ResponseUtil.success(res, { items: [], pagination: { page: 1, limit: Number(limit), total: 0, totalPages: 0 } }, 'No items found');
          return;
        }
        filter['category'] = cat._id;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .populate('category', 'name slug image')
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    ResponseUtil.success(res, {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Items retrieved successfully');
  } catch (error) {
    console.error('❌ getItems error:', error);
    ResponseUtil.serverError(res);
  }
};

// GET /api/menu/items/:slug
export const getItemBySlug = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const item = await MenuItem.findOne({
      slug: req.params.slug,
      isAvailable: true,
    })
      .populate('category', 'name slug image')
      .lean();

    if (!item) {
      ResponseUtil.notFound(res, 'Menu item not found');
      return;
    }

    ResponseUtil.success(res, item, 'Menu item retrieved successfully');
  } catch (error) {
    console.error('❌ getItemBySlug error:', error);
    ResponseUtil.serverError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES — ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/menu/admin/categories  (all, including inactive)
export const adminGetCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await MenuCategory.find()
      .sort({ order: 1, createdAt: 1 })
      .lean();

    ResponseUtil.success(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    console.error('❌ adminGetCategories error:', error);
    ResponseUtil.serverError(res);
  }
};

// POST /api/menu/admin/categories
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { name, description, image, order, isActive } = req.body;

    // Generate slug from French name
    const baseSlug = generateSlug(name.fr);
    const slug = await ensureUniqueSlug(baseSlug, 'category');

    const category = new MenuCategory({
      name,
      slug,
      description,
      image,
      order: order ?? 0,
      isActive: isActive ?? true,
    });

    await category.save();

    ResponseUtil.created(res, category, 'Category created successfully');
  } catch (error) {
    console.error('❌ createCategory error:', error);
    ResponseUtil.serverError(res);
  }
};

// PUT /api/menu/admin/categories/:id
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { id } = req.params;
    const { name, description, image, order, isActive } = req.body;

    const category = await MenuCategory.findById(id);
    if (!category) {
      ResponseUtil.notFound(res, 'Category not found');
      return;
    }

    // Regenerate slug only if French name changed
    if (name?.fr && name.fr !== category.name.fr) {
      const baseSlug = generateSlug(name.fr);
      category.slug = await ensureUniqueSlug(baseSlug, 'category', id);
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    ResponseUtil.success(res, category, 'Category updated successfully');
  } catch (error) {
    console.error('❌ updateCategory error:', error);
    ResponseUtil.serverError(res);
  }
};

// DELETE /api/menu/admin/categories/:id
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { id } = req.params;

    const category = await MenuCategory.findById(id);
    if (!category) {
      ResponseUtil.notFound(res, 'Category not found');
      return;
    }

    // Check if there are items in this category
    const itemCount = await MenuItem.countDocuments({ category: id });
    if (itemCount > 0) {
      ResponseUtil.error(
        res,
        `Cannot delete category: it contains ${itemCount} item(s). Remove or reassign items first.`,
        undefined,
        409
      );
      return;
    }

    await MenuCategory.findByIdAndDelete(id);

    ResponseUtil.success(res, null, 'Category deleted successfully');
  } catch (error) {
    console.error('❌ deleteCategory error:', error);
    ResponseUtil.serverError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ITEMS — ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/menu/admin/items  (all, including unavailable)
export const adminGetItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, page = '1', limit = '50' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter['category'] = new mongoose.Types.ObjectId(category);
      } else {
        const cat = await MenuCategory.findOne({ slug: category }).select('_id');
        if (cat) filter['category'] = cat._id;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .populate('category', 'name slug')
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    ResponseUtil.success(res, {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Items retrieved successfully');
  } catch (error) {
    console.error('❌ adminGetItems error:', error);
    ResponseUtil.serverError(res);
  }
};

// POST /api/menu/admin/items
export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const {
      category,
      name,
      description,
      price,
      image,
      video,
      allergens,
      tags,
      isAvailable,
      isFeatured,
      order,
      nutritionInfo,
      preparationTime,
    } = req.body;

    // Verify category exists
    const categoryExists = await MenuCategory.findById(category);
    if (!categoryExists) {
      ResponseUtil.error(res, 'Category not found', [{ field: 'category', message: 'Category does not exist' }], 422);
      return;
    }

    const baseSlug = generateSlug(name.fr);
    const slug = await ensureUniqueSlug(baseSlug, 'item');

    const item = new MenuItem({
      category,
      name,
      slug,
      description,
      price,
      image,
      video,
      allergens: allergens ?? [],
      tags: tags ?? [],
      isAvailable: isAvailable ?? true,
      isFeatured: isFeatured ?? false,
      order: order ?? 0,
      nutritionInfo,
      preparationTime,
    });

    await item.save();
    await item.populate('category', 'name slug');

    ResponseUtil.created(res, item, 'Menu item created successfully');
  } catch (error) {
    console.error('❌ createMenuItem error:', error);
    ResponseUtil.serverError(res);
  }
};

// PUT /api/menu/admin/items/:id
export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { id } = req.params;

    const item = await MenuItem.findById(id);
    if (!item) {
      ResponseUtil.notFound(res, 'Menu item not found');
      return;
    }

    const {
      category,
      name,
      description,
      price,
      image,
      video,
      allergens,
      tags,
      isAvailable,
      isFeatured,
      order,
      nutritionInfo,
      preparationTime,
    } = req.body;

    // Verify new category exists if provided
    if (category !== undefined) {
      const categoryExists = await MenuCategory.findById(category);
      if (!categoryExists) {
        ResponseUtil.error(res, 'Category not found', [{ field: 'category', message: 'Category does not exist' }], 422);
        return;
      }
      item.category = category;
    }

    // Regenerate slug only if French name changed
    if (name?.fr && name.fr !== item.name.fr) {
      const baseSlug = generateSlug(name.fr);
      item.slug = await ensureUniqueSlug(baseSlug, 'item', id);
    }

    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = price;
    if (image !== undefined) item.image = image;
    if (video !== undefined) item.video = video;
    if (allergens !== undefined) item.allergens = allergens;
    if (tags !== undefined) item.tags = tags;
    if (isAvailable !== undefined) item.isAvailable = isAvailable;
    if (isFeatured !== undefined) item.isFeatured = isFeatured;
    if (order !== undefined) item.order = order;
    if (nutritionInfo !== undefined) item.nutritionInfo = nutritionInfo;
    if (preparationTime !== undefined) item.preparationTime = preparationTime;

    await item.save();
    await item.populate('category', 'name slug');

    ResponseUtil.success(res, item, 'Menu item updated successfully');
  } catch (error) {
    console.error('❌ updateMenuItem error:', error);
    ResponseUtil.serverError(res);
  }
};

// DELETE /api/menu/admin/items/:id
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { id } = req.params;

    const item = await MenuItem.findById(id);
    if (!item) {
      ResponseUtil.notFound(res, 'Menu item not found');
      return;
    }

    await MenuItem.findByIdAndDelete(id);

    ResponseUtil.success(res, null, 'Menu item deleted successfully');
  } catch (error) {
    console.error('❌ deleteMenuItem error:', error);
    ResponseUtil.serverError(res);
  }
};
