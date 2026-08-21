import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';
import { Review, ReviewStats } from '../models/review.model';
import { ApiResponse } from '../models/api-response.model';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateReviewDto {
  customerName: string;
  rating: number;
  reviewText: string;
  /** Optional — backend defaults to 'website' when omitted. */
  source?: string;
  sourceUrl?: string;
  reviewDate?: string;
}

export interface UpdateReviewDto {
  isApproved?: boolean;
  isPublished?: boolean;
  order?: number;
  customerName?: string;
  reviewText?: string;
  rating?: number;
  sourceUrl?: string;
}

export interface PublicReviewsParams {
  page?: number;
  limit?: number;
  source?: string;
}

export interface AdminReviewsParams extends PublicReviewsParams {
  isApproved?: boolean;
  isPublished?: boolean;
}

export interface PaginatedReviews {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Minimal public response after submit
export interface SubmittedReview {
  _id: string;
  customerName: string;
  rating: number;
  source: string;
  reviewDate: Date;
  createdAt: Date;
}

// ─── Review Service ───────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ReviewService {

  constructor(private http: HttpService) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  /**
   * POST /api/reviews
   * Submit a new review (pending moderation).
   */
  createReview(dto: CreateReviewDto): Observable<ApiResponse<SubmittedReview>> {
    return this.http.post<SubmittedReview>('/reviews', dto);
  }

  /**
   * GET /api/reviews
   * Returns approved + published reviews with optional filters.
   */
  getPublicReviews(params?: PublicReviewsParams): Observable<ApiResponse<PaginatedReviews>> {
    const parts: string[] = [];
    if (params?.page)   parts.push(`page=${params.page}`);
    if (params?.limit)  parts.push(`limit=${params.limit}`);
    if (params?.source) parts.push(`source=${encodeURIComponent(params.source)}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    return this.http.get<PaginatedReviews>(`/reviews${qs}`);
  }

  /**
   * GET /api/reviews/stats
   * Returns aggregate rating statistics.
   */
  getReviewStats(): Observable<ApiResponse<ReviewStats>> {
    return this.http.get<ReviewStats>('/reviews/stats');
  }

  /**
   * GET /api/reviews/:id
   * Returns a single public (approved + published) review.
   */
  getReview(id: string): Observable<ApiResponse<Review>> {
    return this.http.get<Review>(`/reviews/${id}`);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  /**
   * GET /api/reviews/admin
   * Returns all reviews with optional filters (admin only).
   */
  getAdminReviews(params?: AdminReviewsParams): Observable<ApiResponse<PaginatedReviews>> {
    const parts: string[] = [];
    if (params?.page !== undefined)        parts.push(`page=${params.page}`);
    if (params?.limit !== undefined)       parts.push(`limit=${params.limit}`);
    if (params?.source)                    parts.push(`source=${encodeURIComponent(params.source)}`);
    if (params?.isApproved !== undefined)  parts.push(`isApproved=${params.isApproved}`);
    if (params?.isPublished !== undefined) parts.push(`isPublished=${params.isPublished}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    return this.http.get<PaginatedReviews>(`/reviews/admin${qs}`);
  }

  /**
   * GET /api/reviews/admin/:id
   */
  getAdminReview(id: string): Observable<ApiResponse<Review>> {
    return this.http.get<Review>(`/reviews/admin/${id}`);
  }

  /**
   * PUT /api/reviews/admin/:id
   * Approve, publish, reject, reorder or edit a review.
   */
  updateReview(id: string, dto: UpdateReviewDto): Observable<ApiResponse<Review>> {
    return this.http.put<Review>(`/reviews/admin/${id}`, dto);
  }

  /**
   * Convenience: approve a review.
   */
  approveReview(id: string): Observable<ApiResponse<Review>> {
    return this.updateReview(id, { isApproved: true });
  }

  /**
   * Convenience: approve + publish a review.
   */
  publishReview(id: string): Observable<ApiResponse<Review>> {
    return this.updateReview(id, { isApproved: true, isPublished: true });
  }

  /**
   * Convenience: un-approve and un-publish a review.
   */
  rejectReview(id: string): Observable<ApiResponse<Review>> {
    return this.updateReview(id, { isApproved: false, isPublished: false });
  }

  /**
   * DELETE /api/reviews/admin/:id
   */
  deleteReview(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<null>(`/reviews/admin/${id}`);
  }
}
