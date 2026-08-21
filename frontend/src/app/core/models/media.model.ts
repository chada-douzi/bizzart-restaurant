// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaType = 'image' | 'video';

export type MediaCategory = 'food' | 'restaurant' | 'team' | 'events' | 'gallery';

// ─── Media model ─────────────────────────────────────────────────────────────

export interface Media {
  _id: string;
  type: MediaType;
  category: MediaCategory;
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  title?: string;
  altText?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  duration?: number;
  isVisible: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface UpdateMediaDto {
  category?: MediaCategory;
  title?: string;
  altText?: string;
  isVisible?: boolean;
  order?: number;
}

export interface ReorderMediaDto {
  items: Array<{ id: string; order: number }>;
}

// ─── Paginated response ───────────────────────────────────────────────────────

export interface PaginatedMedia {
  media: Media[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface GalleryParams {
  category?: MediaCategory | string;
  type?: MediaType;
  page?: number;
  limit?: number;
}

// ─── Upload result ────────────────────────────────────────────────────────────

export interface UploadMediaPayload {
  file: File;
  category: MediaCategory;
  title?: string;
  altText?: string;
  order?: number;
  isVisible?: boolean;
}
