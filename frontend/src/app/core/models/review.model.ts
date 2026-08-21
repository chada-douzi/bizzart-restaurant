export interface Review {
  _id: string;
  customerName: string;
  rating: number;
  reviewText: string;
  source: ReviewSource;
  sourceUrl?: string;
  reviewDate: Date;
  isApproved: boolean;
  isPublished: boolean;
  /**
   * Set by the backend when isApproved is set to true.
   * The admin API populates it as { firstName, lastName, email };
   * the public API omits it entirely.
   * We type it as a union so both cases are handled safely.
   */
  approvedBy?: string | { firstName: string; lastName: string; email: string };
  approvedAt?: Date;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ReviewSource = 'google' | 'tripadvisor' | 'facebook' | 'website';

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
