import { Request, Response } from 'express';
import { Reservation } from '../models/reservation.model';
import { Review } from '../models/review.model';
import { MenuCategory } from '../models/menu-category.model';
import { MenuItem } from '../models/menu-item.model';
import { ResponseUtil } from '../utils/response.util';
import { CONSTANTS } from '../config/constants';

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
// Returns a single aggregated payload for the admin dashboard.
// All queries run in parallel to minimise latency.

export const getAdminStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalReservations,
      todayReservations,
      pendingReservations,
      confirmedReservations,
      recentReservations,
      totalReviews,
      pendingReviews,
      reviewStatsAgg,
      totalCategories,
      totalItems,
      recentReviews,
    ] = await Promise.all([
      // Reservations
      Reservation.countDocuments({}),
      Reservation.countDocuments({ date: { $gte: today, $lte: todayEnd } }),
      Reservation.countDocuments({ status: CONSTANTS.RESERVATION_STATUS.PENDING }),
      Reservation.countDocuments({ status: CONSTANTS.RESERVATION_STATUS.CONFIRMED }),
      Reservation.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('customer.firstName customer.lastName date time guests status createdAt')
        .lean(),

      // Reviews
      Review.countDocuments({}),
      Review.countDocuments({ isApproved: false }),
      Review.aggregate([
        { $match: { isApproved: true, isPublished: true } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
          },
        },
      ]),
      // Menu
      MenuCategory.countDocuments({}),
      MenuItem.countDocuments({}),
      Review.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('customerName rating reviewText source isApproved isPublished createdAt')
        .lean(),
    ]);

    const averageRating = reviewStatsAgg[0]?.averageRating
      ? Math.round(reviewStatsAgg[0].averageRating * 10) / 10
      : 0;

    ResponseUtil.success(res, {
      reservations: {
        total: totalReservations,
        today: todayReservations,
        pending: pendingReservations,
        confirmed: confirmedReservations,
        recent: recentReservations,
      },
      reviews: {
        total: totalReviews,
        pendingApproval: pendingReviews,
        averageRating,
        recent: recentReviews,
      },
      menu: {
        totalCategories,
        totalItems,
      },
    }, 'Stats retrieved successfully');
  } catch (error) {
    console.error('❌ getAdminStats error:', error);
    ResponseUtil.serverError(res);
  }
};
