export const CONSTANTS = {
  // Reservation
  MAX_GUESTS_PER_RESERVATION: 20,
  MIN_GUESTS_PER_RESERVATION: 1,
  MAX_DAILY_RESERVATIONS: 50,
  ADVANCE_BOOKING_DAYS: 30,
  TIME_SLOT_DURATION: 30, // minutes

  // File Upload
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],

  // Rate Limiting
  LOGIN_RATE_LIMIT: 5, // attempts
  LOGIN_RATE_WINDOW: 15 * 60 * 1000, // 15 minutes
  API_RATE_LIMIT: 100, // requests
  API_RATE_WINDOW: 15 * 60 * 1000, // 15 minutes

  // JWT
  JWT_COOKIE_NAME: 'auth_token',
  JWT_EXPIRES_IN: '4h',

  // Reservation Status
  RESERVATION_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
  } as const,

  // User Roles
  USER_ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
  } as const,

  // Review Sources
  REVIEW_SOURCES: {
    GOOGLE: 'google',
    TRIPADVISOR: 'tripadvisor',
    FACEBOOK: 'facebook',
    WEBSITE: 'website',
  } as const,

  // Media Types
  MEDIA_TYPES: {
    IMAGE: 'image',
    VIDEO: 'video',
  } as const,

  // Media Categories
  MEDIA_CATEGORIES: {
    FOOD: 'food',
    RESTAURANT: 'restaurant',
    TEAM: 'team',
    EVENTS: 'events',
    GALLERY: 'gallery',
  } as const,
};

export type ReservationStatus = typeof CONSTANTS.RESERVATION_STATUS[keyof typeof CONSTANTS.RESERVATION_STATUS];
export type UserRole = typeof CONSTANTS.USER_ROLES[keyof typeof CONSTANTS.USER_ROLES];
export type ReviewSource = typeof CONSTANTS.REVIEW_SOURCES[keyof typeof CONSTANTS.REVIEW_SOURCES];
export type MediaType = typeof CONSTANTS.MEDIA_TYPES[keyof typeof CONSTANTS.MEDIA_TYPES];
export type MediaCategory = typeof CONSTANTS.MEDIA_CATEGORIES[keyof typeof CONSTANTS.MEDIA_CATEGORIES];
