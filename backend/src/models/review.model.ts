import mongoose, { Document, Schema, Types } from 'mongoose';
import { ReviewSource, CONSTANTS } from '../config/constants';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IReview extends Document {
  customerName: string;
  rating: number;
  reviewText: string;
  source: ReviewSource;
  sourceUrl?: string;
  reviewDate: Date;
  isApproved: boolean;
  isPublished: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const reviewSchema = new Schema<IReview>(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name must not exceed 100 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must not exceed 5'],
    },
    reviewText: {
      type: String,
      required: [true, 'Review text is required'],
      trim: true,
      minlength: [10, 'Review text must be at least 10 characters'],
      maxlength: [2000, 'Review text must not exceed 2000 characters'],
    },
    source: {
      type: String,
      enum: {
        values: Object.values(CONSTANTS.REVIEW_SOURCES),
        message: 'Invalid review source',
      },
      required: [true, 'Review source is required'],
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    reviewDate: {
      type: Date,
      required: [true, 'Review date is required'],
      default: () => new Date(),
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    approvedAt: {
      type: Date,
      default: undefined,
    },
    order: {
      type: Number,
      min: [0, 'Order must be a positive number'],
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

reviewSchema.index({ isPublished: 1, isApproved: 1, order: 1 }); // Public reviews, sorted
reviewSchema.index({ source: 1 });                                  // Filter by source
reviewSchema.index({ rating: 1 });                                  // Rating distribution / stats
reviewSchema.index({ reviewDate: -1 });                            // Sort by most recent

// ─── Model ────────────────────────────────────────────────────────────────────

export const Review = mongoose.model<IReview>('Review', reviewSchema);
