import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Review } from '../models/review.model';
import { ResponseUtil } from '../utils/response.util';
import { CONSTANTS } from '../config/constants';

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

// POST /api/reviews
// Public: submit a review — requires moderation before appearing publicly
export const createReview = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    // Extract only the fields a public user is allowed to submit.
    // isApproved, isPublished, approvedBy, approvedAt, order are intentionally
    // ignored — a client cannot self-publish a review, even if they send those fields.
    const {
      customerName,
      rating,
      reviewText,
      sourceUrl,
      reviewDate,
    } = req.body;

    // source defaults to 'website' when not provided — clients submitting via
    // the public form never need to know about this internal field.
    const source: string = req.body.source || CONSTANTS.REVIEW_SOURCES.WEBSITE;

    const review = new Review({
      customerName,
      rating,
      reviewText,
      source,
      sourceUrl,
      reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
      // Always false on creation — moderation is mandatory
      isApproved: false,
      isPublished: false,
    });

    await review.save();

    // Return only submitted fields — never expose approval/publication status
    ResponseUtil.created(res, {
      _id: review._id,
      customerName: review.customerName,
      rating: review.rating,
      reviewDate: review.reviewDate,
      createdAt: review.createdAt,
    }, 'Thank you for your review! It will be published after moderation.');
  } catch (error) {
    console.error('❌ createReview error:', error);
    ResponseUtil.serverError(res);
  }
};

// GET /api/reviews
// Public: returns only approved + published reviews
export const getPublicReviews = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { source, page = '1', limit = '10' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {
      isApproved: true,
      isPublished: true,
    };

    if (source && Object.values(CONSTANTS.REVIEW_SOURCES).includes(source as any)) {
      filter['source'] = source;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ order: 1, reviewDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-isApproved -isPublished -approvedBy -approvedAt -updatedAt')
        .lean(),
      Review.countDocuments(filter),
    ]);

    ResponseUtil.success(res, {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Reviews retrieved successfully');
  } catch (error) {
    console.error('❌ getPublicReviews error:', error);
    ResponseUtil.serverError(res);
  }
};

// GET /api/reviews/stats
// Public: aggregate rating stats for display on homepage
export const getReviewStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const filter = { isApproved: true, isPublished: true };

    const [totalDocs, ratingAgg] = await Promise.all([
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            count5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            count4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            count3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            count2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            count1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = ratingAgg[0] ?? {
      averageRating: 0,
      count5: 0, count4: 0, count3: 0, count2: 0, count1: 0,
    };

    ResponseUtil.success(res, {
      averageRating: Math.round((stats.averageRating ?? 0) * 10) / 10,
      totalReviews: totalDocs,
      ratingDistribution: {
        5: stats.count5,
        4: stats.count4,
        3: stats.count3,
        2: stats.count2,
        1: stats.count1,
      },
    }, 'Review stats retrieved successfully');
  } catch (error) {
    console.error('❌ getReviewStats error:', error);
    ResponseUtil.serverError(res);
  }
};

// GET /api/reviews/:id
// Public: single approved+published review
export const getPublicReviewById = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const review = await Review.findOne({
      _id: req.params.id,
      isApproved: true,
      isPublished: true,
    })
      .select('-isApproved -isPublished -approvedBy -approvedAt -updatedAt')
      .lean();

    if (!review) {
      ResponseUtil.notFound(res, 'Review not found');
      return;
    }

    ResponseUtil.success(res, review, 'Review retrieved successfully');
  } catch (error) {
    console.error('❌ getPublicReviewById error:', error);
    ResponseUtil.serverError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/reviews/admin
export const adminGetReviews = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const {
      source,
      isApproved,
      isPublished,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};

    if (source) filter['source'] = source;
    if (isApproved !== undefined) filter['isApproved'] = isApproved === 'true';
    if (isPublished !== undefined) filter['isPublished'] = isPublished === 'true';

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('approvedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter),
    ]);

    ResponseUtil.success(res, {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Reviews retrieved successfully');
  } catch (error) {
    console.error('❌ adminGetReviews error:', error);
    ResponseUtil.serverError(res);
  }
};

// GET /api/reviews/admin/:id
export const adminGetReviewById = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const review = await Review.findById(req.params.id)
      .populate('approvedBy', 'firstName lastName email')
      .lean();

    if (!review) {
      ResponseUtil.notFound(res, 'Review not found');
      return;
    }

    ResponseUtil.success(res, review, 'Review retrieved successfully');
  } catch (error) {
    console.error('❌ adminGetReviewById error:', error);
    ResponseUtil.serverError(res);
  }
};

// PUT /api/reviews/admin/:id
// Admin: approve, publish, reject, reorder, or edit a review
export const adminUpdateReview = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      ResponseUtil.notFound(res, 'Review not found');
      return;
    }

    const { isApproved, isPublished, order, customerName, reviewText, rating, sourceUrl } = req.body;

    // Track approval
    if (isApproved !== undefined) {
      review.isApproved = isApproved;
      if (isApproved === true && !review.approvedBy) {
        // Set approvedBy and approvedAt only on first approval
        review.approvedBy = req.user?.id
          ? new mongoose.Types.ObjectId(req.user.id)
          : undefined;
        review.approvedAt = new Date();
      }
      // If un-approving, also un-publish
      if (isApproved === false) {
        review.isPublished = false;
      }
    }

    if (isPublished !== undefined) {
      // Cannot publish a non-approved review
      if (isPublished === true && !review.isApproved) {
        ResponseUtil.error(res, 'Review must be approved before it can be published', undefined, 400);
        return;
      }
      review.isPublished = isPublished;
    }

    if (order !== undefined) review.order = order;
    if (customerName !== undefined) review.customerName = customerName;
    if (reviewText !== undefined) review.reviewText = reviewText;
    if (rating !== undefined) review.rating = rating;
    if (sourceUrl !== undefined) review.sourceUrl = sourceUrl;

    await review.save();
    await review.populate('approvedBy', 'firstName lastName email');

    ResponseUtil.success(res, review, 'Review updated successfully');
  } catch (error) {
    console.error('❌ adminUpdateReview error:', error);
    ResponseUtil.serverError(res);
  }
};

// DELETE /api/reviews/admin/:id
export const adminDeleteReview = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      ResponseUtil.notFound(res, 'Review not found');
      return;
    }

    await Review.findByIdAndDelete(req.params.id);

    ResponseUtil.success(res, null, 'Review deleted successfully');
  } catch (error) {
    console.error('❌ adminDeleteReview error:', error);
    ResponseUtil.serverError(res);
  }
};
