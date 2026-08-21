import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpService } from './http.service';
import {
  MenuCategory,
  MenuItem,
  CreateMenuItemDto,
  MultiLanguageText,
} from '../models/menu.model';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateCategoryDto {
  name: MultiLanguageText;
  description?: MultiLanguageText;
  image?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  name?: MultiLanguageText;
  description?: MultiLanguageText;
  image?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {
  isAvailable?: boolean;
  order?: number;
}

export interface GetItemsParams {
  category?: string;    // slug or ID
  featured?: boolean;
  available?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedItems {
  items: MenuItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

// ─── Menu Service ─────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  constructor(
    private http: HttpService,
    private httpClient: HttpClient,
  ) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  /**
   * GET /api/menu/categories
   * Returns active categories sorted by order.
   */
  getCategories(): Observable<ApiResponse<MenuCategory[]>> {
    return this.http.get<MenuCategory[]>('/menu/categories');
  }

  /**
   * GET /api/menu/categories/:slug
   * Returns a single category with its available items.
   */
  getCategoryBySlug(slug: string): Observable<ApiResponse<CategoryWithItems>> {
    return this.http.get<CategoryWithItems>(`/menu/categories/${slug}`);
  }

  /**
   * GET /api/menu/items
   * Returns available items with optional filtering and pagination.
   */
  getItems(params?: GetItemsParams): Observable<ApiResponse<PaginatedItems>> {
    const queryParts: string[] = [];

    if (params?.category !== undefined) {
      queryParts.push(`category=${encodeURIComponent(params.category)}`);
    }
    if (params?.featured !== undefined) {
      queryParts.push(`featured=${params.featured}`);
    }
    if (params?.available !== undefined) {
      queryParts.push(`available=${params.available}`);
    }
    if (params?.page !== undefined) {
      queryParts.push(`page=${params.page}`);
    }
    if (params?.limit !== undefined) {
      queryParts.push(`limit=${params.limit}`);
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.http.get<PaginatedItems>(`/menu/items${queryString}`);
  }

  /**
   * GET /api/menu/items/:slug
   * Returns a single available menu item.
   */
  getItemBySlug(slug: string): Observable<ApiResponse<MenuItem>> {
    return this.http.get<MenuItem>(`/menu/items/${slug}`);
  }

  /**
   * Convenience: returns only featured items (isFeatured=true).
   */
  getFeaturedItems(): Observable<ApiResponse<PaginatedItems>> {
    return this.getItems({ featured: true, limit: 10 });
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────
  // All admin methods require valid JWT cookie (sent automatically via withCredentials)

  /**
   * GET /api/menu/admin/categories
   * Returns all categories including inactive ones.
   */
  adminGetCategories(): Observable<ApiResponse<MenuCategory[]>> {
    return this.http.get<MenuCategory[]>('/menu/admin/categories');
  }

  /**
   * POST /api/menu/admin/categories
   */
  createCategory(dto: CreateCategoryDto): Observable<ApiResponse<MenuCategory>> {
    return this.http.post<MenuCategory>('/menu/admin/categories', dto);
  }

  /**
   * PUT /api/menu/admin/categories/:id
   */
  updateCategory(id: string, dto: UpdateCategoryDto): Observable<ApiResponse<MenuCategory>> {
    return this.http.put<MenuCategory>(`/menu/admin/categories/${id}`, dto);
  }

  /**
   * DELETE /api/menu/admin/categories/:id
   */
  deleteCategory(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<null>(`/menu/admin/categories/${id}`);
  }

  /**
   * GET /api/menu/admin/items
   * Returns all items including unavailable ones.
   */
  adminGetItems(params?: { category?: string; page?: number; limit?: number }): Observable<ApiResponse<PaginatedItems>> {
    const queryParts: string[] = [];

    if (params?.category !== undefined) {
      queryParts.push(`category=${encodeURIComponent(params.category)}`);
    }
    if (params?.page !== undefined) {
      queryParts.push(`page=${params.page}`);
    }
    if (params?.limit !== undefined) {
      queryParts.push(`limit=${params.limit}`);
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.http.get<PaginatedItems>(`/menu/admin/items${queryString}`);
  }

  /**
   * POST /api/menu/admin/items
   */
  createItem(dto: CreateMenuItemDto): Observable<ApiResponse<MenuItem>> {
    return this.http.post<MenuItem>('/menu/admin/items', dto);
  }

  /**
   * PUT /api/menu/admin/items/:id
   */
  updateItem(id: string, dto: UpdateMenuItemDto): Observable<ApiResponse<MenuItem>> {
    return this.http.put<MenuItem>(`/menu/admin/items/${id}`, dto);
  }

  /**
   * DELETE /api/menu/admin/items/:id
   */
  deleteItem(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<null>(`/menu/admin/items/${id}`);
  }

  // ─── UPLOAD ───────────────────────────────────────────────────────────────

  /**
   * POST /api/upload
   * Uploads an image to Cloudinary and returns { url, publicId }.
   * Uses FormData (multipart) — HttpClient required, not HttpService wrapper.
   */
  uploadImage(file: File, folder: 'bizzart/menu' | 'bizzart/categories' = 'bizzart/menu'): Observable<ApiResponse<{ url: string; publicId: string }>> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    return this.httpClient.post<ApiResponse<{ url: string; publicId: string }>>(
      `${environment.apiUrl}/upload`,
      formData,
      { withCredentials: true }
    );
  }
}
