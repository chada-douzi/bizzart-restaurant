import mongoose, { Document, Schema } from 'mongoose';
import { CONSTANTS, MediaType, MediaCategory } from '../config/constants';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IMedia extends Document {
  type: MediaType;          // 'image' | 'video'
  category: MediaCategory;  // 'food' | 'restaurant' | 'team' | 'events' | 'gallery'
  url: string;              // Cloudinary secure_url
  publicId: string;         // Cloudinary public_id (needed for deletion/replacement)
  thumbnailUrl?: string;    // For videos: Cloudinary-generated thumbnail
  title?: string;           // Optional display title
  altText?: string;         // Alt text for accessibility
  width?: number;           // Original width in pixels
  height?: number;          // Original height in pixels
  format?: string;          // 'jpg' | 'webp' | 'mp4' | etc.
  size?: number;            // File size in bytes
  duration?: number;        // Video duration in seconds (videos only)
  isVisible: boolean;       // Controls public visibility
  order: number;            // Display order within category
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const mediaSchema = new Schema<IMedia>(
  {
    type: {
      type: String,
      enum: {
        values: Object.values(CONSTANTS.MEDIA_TYPES),
        message: 'Invalid media type',
      },
      required: [true, 'Media type is required'],
    },
    category: {
      type: String,
      enum: {
        values: Object.values(CONSTANTS.MEDIA_CATEGORIES),
        message: 'Invalid media category',
      },
      required: [true, 'Media category is required'],
    },
    url: {
      type: String,
      required: [true, 'Media URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required'],
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
      default: undefined,
    },
    altText: {
      type: String,
      trim: true,
      maxlength: [300, 'Alt text must not exceed 300 characters'],
      default: undefined,
    },
    width: {
      type: Number,
      min: 0,
      default: undefined,
    },
    height: {
      type: Number,
      min: 0,
      default: undefined,
    },
    format: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
    },
    size: {
      type: Number,
      min: 0,
      default: undefined,
    },
    duration: {
      type: Number,
      min: 0,
      default: undefined,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

mediaSchema.index({ category: 1, isVisible: 1, order: 1 }); // Main public query
mediaSchema.index({ type: 1, category: 1 });                 // Filter by type + category
mediaSchema.index({ isVisible: 1, order: 1 });               // All visible media
mediaSchema.index({ publicId: 1 }, { unique: true });        // Prevent duplicate uploads

// ─── Model ────────────────────────────────────────────────────────────────────

export const Media = mongoose.model<IMedia>('Media', mediaSchema);
