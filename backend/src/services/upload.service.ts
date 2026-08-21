import multer, { FileFilterCallback } from 'multer';
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CONSTANTS } from '../config/constants';
import { ResponseUtil } from '../utils/response.util';

// ─── Allowed types ────────────────────────────────────────────────────────────

const ALLOWED_MEDIA_TYPES = [
  ...CONSTANTS.ALLOWED_IMAGE_TYPES,
  ...CONSTANTS.ALLOWED_VIDEO_TYPES,
];

// ─── Multer configuration — memory storage (no local disk writes) ─────────────

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(
      `Invalid file type: ${file.mimetype}. Allowed images: ${CONSTANTS.ALLOWED_IMAGE_TYPES.join(', ')}. Allowed videos: ${CONSTANTS.ALLOWED_VIDEO_TYPES.join(', ')}`
    ));
  }
};

// Image-only middleware (for menu items, category images, etc.)
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CONSTANTS.MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (CONSTANTS.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid image type: ${file.mimetype}`));
    }
  },
}).single('image');

// Media middleware — accepts both images and videos (for gallery)
export const uploadMediaMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CONSTANTS.MAX_VIDEO_SIZE, files: 1 }, // 50MB max for videos
  fileFilter,
}).single('file');

// ─── Upload helpers ───────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  duration?: number;       // seconds — videos only
  thumbnailUrl?: string;   // auto-generated thumbnail for videos
  resourceType: 'image' | 'video';
}

/**
 * Uploads an image buffer to Cloudinary.
 */
export function uploadToCloudinary(
  buffer: Buffer,
  folder: string = 'bizzart/menu'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary image upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
          resourceType: 'image',
        });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Uploads a video buffer to Cloudinary.
 * Returns a thumbnail URL (Cloudinary auto-generates one).
 */
export function uploadVideoToCloudinary(
  buffer: Buffer,
  folder: string = 'bizzart/gallery'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm'],
        // Generate a thumbnail at 1s into the video
        eager: [{ format: 'jpg', transformation: [{ start_offset: '1', width: 800, height: 600, crop: 'fill' }] }],
        eager_async: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary video upload failed'));
          return;
        }
        // Thumbnail from eager transformation or derive from URL
        const thumbnail = result.eager?.[0]?.secure_url
          ?? result.secure_url.replace(/\.(mp4|webm)$/, '.jpg').replace('/video/upload/', '/video/upload/so_1/');

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
          duration: result.duration,
          thumbnailUrl: thumbnail,
          resourceType: 'video',
        });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Deletes a resource from Cloudinary by public_id.
 */
export function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// ─── Handler — POST /api/upload (images only — menu/categories) ───────────────

export const handleUpload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    ResponseUtil.error(res, 'No image file provided', [{ field: 'image', message: 'image field is required' }], 422);
    return;
  }

  try {
    const folder = (req.body.folder as string) || 'bizzart/menu';
    const result = await uploadToCloudinary(req.file.buffer, folder);

    ResponseUtil.created(res, {
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.size,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    }, 'Image uploaded successfully');
  } catch (error) {
    console.error('❌ Upload error:', error);
    ResponseUtil.serverError(res, 'Image upload failed');
  }
};
