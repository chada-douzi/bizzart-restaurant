import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { uploadMiddleware, handleUpload } from '../services/upload.service';
import { ResponseUtil } from '../utils/response.util';

const router = Router();

// ─── POST /api/upload ─────────────────────────────────────────────────────────
// Protected: requires valid JWT cookie + admin role
// Accepts: multipart/form-data with field "image"
// Optional body field: "folder" (default: "bizzart/menu")

router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  // Wrap multer to handle its errors with ResponseUtil format
  (req: Request, res: Response, next: NextFunction): void => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        const message = err.message ?? 'File upload error';
        if (err.code === 'LIMIT_FILE_SIZE') {
          ResponseUtil.error(res, 'File too large', [{ field: 'image', message: 'Maximum file size is 5MB' }], 413);
          return;
        }
        ResponseUtil.error(res, message, [{ field: 'image', message }], 422);
        return;
      }
      next();
    });
  },
  handleUpload
);

export default router;
