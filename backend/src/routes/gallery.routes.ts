import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { uploadMediaMiddleware } from '../services/upload.service';
import { ResponseUtil } from '../utils/response.util';
import {
  getPublicGallery,
  adminGetGallery,
  adminUploadMedia,
  adminUpdateMedia,
  adminDeleteMedia,
  adminReorderMedia,
} from '../controllers/gallery.controller';
import {
  publicGalleryQueryValidators,
  updateMediaValidators,
  mongoIdParamValidator,
} from '../validators/gallery.validators';

const router = Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// GET /api/gallery
// Returns visible media, optional ?category=food&type=image&page=1&limit=50
router.get('/', publicGalleryQueryValidators, getPublicGallery);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
// All require authMiddleware + adminMiddleware

// GET /api/gallery/admin
// All media including hidden — MUST be declared before /:id to avoid slug collision
router.get('/admin', authMiddleware, adminMiddleware, publicGalleryQueryValidators, adminGetGallery);

// POST /api/gallery/admin/upload
// Multipart upload: field "file" (image or video), optional body fields
router.post(
  '/admin/upload',
  authMiddleware,
  adminMiddleware,
  (req: Request, res: Response, next: NextFunction): void => {
    uploadMediaMiddleware(req, res, (err) => {
      if (err) {
        const message = err.message ?? 'File upload error';
        if (err.code === 'LIMIT_FILE_SIZE') {
          ResponseUtil.error(res, 'File too large', [{ field: 'file', message: 'Maximum file size is 50MB for videos, 5MB for images' }], 413);
          return;
        }
        ResponseUtil.error(res, message, [{ field: 'file', message }], 422);
        return;
      }
      next();
    });
  },
  adminUploadMedia
);

// PATCH /api/gallery/admin/reorder — bulk order update
// MUST be declared before /:id
router.patch('/admin/reorder', authMiddleware, adminMiddleware, adminReorderMedia);

// PUT /api/gallery/admin/:id — update metadata
router.put('/admin/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, updateMediaValidators, adminUpdateMedia);

// DELETE /api/gallery/admin/:id — delete media + Cloudinary asset
router.delete('/admin/:id', authMiddleware, adminMiddleware, mongoIdParamValidator, adminDeleteMedia);

export default router;
