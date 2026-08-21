import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Media } from '../models/media.model';
import { ResponseUtil } from '../utils/response.util';
import { CONSTANTS, MediaCategory, MediaType } from '../config/constants';
import { deleteFromCloudinary, uploadToCloudinary, uploadVideoToCloudinary } from '../services/upload.service';

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

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/gallery
 * Returns visible media items, optionally filtered by category and/or type.
 */
export const getPublicGallery = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const {
      category,
      type,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { isVisible: true };
    if (category) filter['category'] = category;
    if (type)     filter['type']     = type;

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [media, total] = await Promise.all([
      Media.find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-uploadedBy')  // never expose who uploaded
        .lean(),
      Media.countDocuments(filter),
    ]);

    ResponseUtil.success(res, {
      media,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Gallery retrieved successfully');
  } catch (error) {
    console.error('❌ getPublicGallery error:', error);
    ResponseUtil.serverError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/gallery/admin
 * Returns all media (including hidden), for admin management.
 */
export const adminGetGallery = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const {
      category,
      type,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (category) filter['category'] = category;
    if (type)     filter['type']     = type;

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [media, total] = await Promise.all([
      Media.find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Media.countDocuments(filter),
    ]);

    ResponseUtil.success(res, {
      media,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }, 'Gallery retrieved successfully');
  } catch (error) {
    console.error('❌ adminGetGallery error:', error);
    ResponseUtil.serverError(res);
  }
};

/**
 * POST /api/gallery/admin/upload
 * Uploads a file (image or video) to Cloudinary and creates a Media document.
 * Expects multipart/form-data with field "file", plus optional body fields:
 * category, title, altText, order, isVisible.
 */
export const adminUploadMedia = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    ResponseUtil.error(res, 'No file provided', [{ field: 'file', message: 'file field is required' }], 422);
    return;
  }

  try {
    const {
      category = CONSTANTS.MEDIA_CATEGORIES.GALLERY,
      title,
      altText,
      order = '0',
      isVisible = 'true',
    } = req.body as Record<string, string>;

    // Validate category
    if (!Object.values(CONSTANTS.MEDIA_CATEGORIES).includes(category as MediaCategory)) {
      ResponseUtil.error(res, 'Invalid category', [{ field: 'category', message: `Must be one of: ${Object.values(CONSTANTS.MEDIA_CATEGORIES).join(', ')}` }], 422);
      return;
    }

    const isVideo = CONSTANTS.ALLOWED_VIDEO_TYPES.includes(req.file.mimetype);
    const mediaType: MediaType = isVideo ? CONSTANTS.MEDIA_TYPES.VIDEO : CONSTANTS.MEDIA_TYPES.IMAGE;
    const folder = `bizzart/gallery/${category}`;

    // Upload to Cloudinary
    const uploaded = isVideo
      ? await uploadVideoToCloudinary(req.file.buffer, folder)
      : await uploadToCloudinary(req.file.buffer, folder);

    // Persist to MongoDB
    const media = new Media({
      type:         mediaType,
      category:     category as MediaCategory,
      url:          uploaded.url,
      publicId:     uploaded.publicId,
      thumbnailUrl: uploaded.thumbnailUrl,
      title:        title?.trim() || undefined,
      altText:      altText?.trim() || undefined,
      width:        uploaded.width,
      height:       uploaded.height,
      format:       uploaded.format,
      size:         uploaded.size,
      duration:     uploaded.duration,
      isVisible:    isVisible !== 'false',
      order:        parseInt(order, 10) || 0,
      uploadedBy:   req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
    });

    await media.save();

    ResponseUtil.created(res, media, 'Media uploaded successfully');
  } catch (error) {
    console.error('❌ adminUploadMedia error:', error);
    ResponseUtil.serverError(res, 'Media upload failed');
  }
};

/**
 * PUT /api/gallery/admin/:id
 * Updates metadata (category, title, altText, order, isVisible).
 * Does NOT re-upload — use the upload endpoint for that.
 */
export const adminUpdateMedia = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      ResponseUtil.notFound(res, 'Media not found');
      return;
    }

    const { category, title, altText, order, isVisible } = req.body;

    if (category  !== undefined) media.category  = category;
    if (title     !== undefined) media.title     = title?.trim() || undefined;
    if (altText   !== undefined) media.altText   = altText?.trim() || undefined;
    if (order     !== undefined) media.order     = Number(order);
    if (isVisible !== undefined) media.isVisible = Boolean(isVisible);

    await media.save();

    ResponseUtil.success(res, media, 'Media updated successfully');
  } catch (error) {
    console.error('❌ adminUpdateMedia error:', error);
    ResponseUtil.serverError(res);
  }
};

/**
 * DELETE /api/gallery/admin/:id
 * Deletes the Media document AND the Cloudinary asset.
 */
export const adminDeleteMedia = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      ResponseUtil.notFound(res, 'Media not found');
      return;
    }

    // Delete from Cloudinary first (non-blocking on failure — DB entry still removed)
    try {
      await deleteFromCloudinary(
        media.publicId,
        media.type === CONSTANTS.MEDIA_TYPES.VIDEO ? 'video' : 'image'
      );
    } catch (cloudErr) {
      // Log but do not fail the request — Cloudinary cleanup can be done manually
      console.warn(`⚠️  Cloudinary delete failed for ${media.publicId}:`, cloudErr);
    }

    await Media.findByIdAndDelete(req.params.id);

    ResponseUtil.success(res, null, 'Media deleted successfully');
  } catch (error) {
    console.error('❌ adminDeleteMedia error:', error);
    ResponseUtil.serverError(res);
  }
};

/**
 * PATCH /api/gallery/admin/reorder
 * Bulk update of order values.
 * Body: { items: Array<{ id: string; order: number }> }
 */
export const adminReorderMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body as { items: Array<{ id: string; order: number }> };

    if (!Array.isArray(items) || items.length === 0) {
      ResponseUtil.error(res, 'items array is required', undefined, 422);
      return;
    }

    // Bulk write for efficiency
    const ops = items.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { order: Number(order) } },
      },
    }));

    await Media.bulkWrite(ops);

    ResponseUtil.success(res, null, 'Gallery reordered successfully');
  } catch (error) {
    console.error('❌ adminReorderMedia error:', error);
    ResponseUtil.serverError(res);
  }
};
