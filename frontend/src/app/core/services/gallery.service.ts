import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpService } from './http.service';
import {
  Media,
  UpdateMediaDto,
  ReorderMediaDto,
  PaginatedMedia,
  GalleryParams,
  UploadMediaPayload,
} from '../models/media.model';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GalleryService {

  constructor(
    private http: HttpService,
    private httpClient: HttpClient,
  ) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  /**
   * GET /api/gallery
   * Returns visible media (public — no auth required).
   */
  getGallery(params?: GalleryParams): Observable<ApiResponse<PaginatedMedia>> {
    const qs = this.buildQueryString(params);
    return this.http.get<PaginatedMedia>(`/gallery${qs}`);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  /**
   * GET /api/gallery/admin
   * Returns all media including hidden (admin only).
   */
  adminGetGallery(params?: GalleryParams): Observable<ApiResponse<PaginatedMedia>> {
    const qs = this.buildQueryString(params);
    return this.http.get<PaginatedMedia>(`/gallery/admin${qs}`);
  }

  /**
   * POST /api/gallery/admin/upload
   * Uploads a file (image or video) with metadata.
   * Uses FormData — sends multipart/form-data.
   */
  uploadMedia(payload: UploadMediaPayload): Observable<ApiResponse<Media>> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('category', payload.category);
    if (payload.title)     formData.append('title', payload.title);
    if (payload.altText)   formData.append('altText', payload.altText);
    if (payload.order !== undefined) formData.append('order', String(payload.order));
    if (payload.isVisible !== undefined) formData.append('isVisible', String(payload.isVisible));

    // Use HttpClient directly for FormData (avoids Content-Type header conflict)
    return this.httpClient.post<ApiResponse<Media>>(
      `${environment.apiUrl}/gallery/admin/upload`,
      formData,
      { withCredentials: true }
    );
  }

  /**
   * PUT /api/gallery/admin/:id
   * Updates metadata only (title, altText, category, isVisible, order).
   */
  updateMedia(id: string, dto: UpdateMediaDto): Observable<ApiResponse<Media>> {
    return this.http.put<Media>(`/gallery/admin/${id}`, dto);
  }

  /**
   * DELETE /api/gallery/admin/:id
   * Deletes media from DB and Cloudinary.
   */
  deleteMedia(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<null>(`/gallery/admin/${id}`);
  }

  /**
   * PATCH /api/gallery/admin/reorder
   * Bulk order update.
   */
  reorderMedia(dto: ReorderMediaDto): Observable<ApiResponse<null>> {
    return this.httpClient.patch<ApiResponse<null>>(
      `${environment.apiUrl}/gallery/admin/reorder`,
      dto,
      { withCredentials: true }
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildQueryString(params?: GalleryParams): string {
    if (!params) return '';
    const parts: string[] = [];
    if (params.category) parts.push(`category=${encodeURIComponent(params.category)}`);
    if (params.type)     parts.push(`type=${encodeURIComponent(params.type)}`);
    if (params.page)     parts.push(`page=${params.page}`);
    if (params.limit)    parts.push(`limit=${params.limit}`);
    return parts.length ? `?${parts.join('&')}` : '';
  }
}
