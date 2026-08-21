import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';
import {
  Reservation,
  CreateReservationDto,
  ReservationStatus,
} from '../models/reservation.model';
import { ApiResponse } from '../models/api-response.model';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface UpdateStatusDto {
  status: ReservationStatus;
  note?: string;
  tableNumber?: string;
}

export interface AdminReservationsParams {
  status?: ReservationStatus;
  date?: string; // ISO date string YYYY-MM-DD
  page?: number;
  limit?: number;
}

export interface PaginatedReservations {
  reservations: Reservation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Public reservation response (limited fields)
export interface PublicReservationResponse {
  _id: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  date: string | Date;
  time: string;
  guests: number;
  specialRequest?: string;
  status: ReservationStatus;
  createdAt: Date;
}

// ─── Reservation Service ──────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  constructor(private http: HttpService) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  /**
   * POST /api/reservations
   * Create a new reservation (public).
   */
  createReservation(dto: CreateReservationDto): Observable<ApiResponse<PublicReservationResponse>> {
    return this.http.post<PublicReservationResponse>('/reservations', dto);
  }

  /**
   * GET /api/reservations/:id
   * Check own reservation status by ID (public, limited fields).
   */
  getReservation(id: string): Observable<ApiResponse<PublicReservationResponse>> {
    return this.http.get<PublicReservationResponse>(`/reservations/${id}`);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  /**
   * GET /api/reservations/admin
   * List all reservations with optional filters (admin only).
   */
  getAdminReservations(params?: AdminReservationsParams): Observable<ApiResponse<PaginatedReservations>> {
    const queryParts: string[] = [];

    if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.date)   queryParts.push(`date=${encodeURIComponent(params.date)}`);
    if (params?.page)   queryParts.push(`page=${params.page}`);
    if (params?.limit)  queryParts.push(`limit=${params.limit}`);

    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    return this.http.get<PaginatedReservations>(`/reservations/admin${qs}`);
  }

  /**
   * GET /api/reservations/admin/:id
   * Get full reservation details including statusHistory (admin only).
   */
  getAdminReservation(id: string): Observable<ApiResponse<Reservation>> {
    return this.http.get<Reservation>(`/reservations/admin/${id}`);
  }

  /**
   * PUT /api/reservations/admin/:id/status
   * Update reservation status and append to statusHistory (admin only).
   */
  updateReservationStatus(id: string, dto: UpdateStatusDto): Observable<ApiResponse<Reservation>> {
    return this.http.put<Reservation>(`/reservations/admin/${id}/status`, dto);
  }

  /**
   * DELETE /api/reservations/admin/:id
   * Delete a reservation (admin only, only cancelled/rejected/completed).
   */
  deleteReservation(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<null>(`/reservations/admin/${id}`);
  }
}
