import { Injectable, signal } from '@angular/core';
import { Observable, tap, catchError, of } from 'rxjs';
import { HttpService } from './http.service';
import { RestaurantSettings } from '../models/settings.model';
import { ApiResponse } from '../models/api-response.model';

// ─── Public Settings (subset safe for public pages) ───────────────────────────

export interface PublicSettings {
  restaurantName: string;
  description: { fr: string; en?: string; ar?: string };
  contact: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    coordinates: { lat: number; lng: number };
  };
  openingHours: Array<{
    day: string;
    isOpen: boolean;
    slots: Array<{ open: string; close: string }>;
  }>;
  socialMedia: { instagram?: string; facebook?: string; tiktok?: string };
  branding: { logo?: string; heroImage?: string; primaryColor?: string; secondaryColor?: string };
  /** Dynamic reservation constraints — exposed publicly for the booking form */
  reservationSettings?: {
    maxGuestsPerReservation: number;
    minGuestsPerReservation: number;
    advanceBookingDays: number;
    timeSlotDuration: number;
  };
  /** Events administrables — only visible ones are returned by the public API */
  events?: Array<{
    title: string;
    description?: string;
    date?: string;
    time?: string;
    imageUrl?: string;
    isVisible: boolean;
  }>;
  seo: {
    metaTitle?: { fr: string; en?: string; ar?: string };
    metaDescription?: { fr: string; en?: string; ar?: string };
    keywords?: string[];
  };
  updatedAt?: Date;
}

// ─── Settings Service ─────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  // Cached public settings — accessible as a signal for reactive components
  readonly publicSettings = signal<PublicSettings | null>(null);
  readonly isLoaded = signal(false);

  constructor(private http: HttpService) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  /**
   * GET /api/settings
   * Loads public settings and caches them in the signal.
   * Safe to call at app startup or in any component.
   */
  loadPublicSettings(): Observable<ApiResponse<PublicSettings>> {
    return this.http.get<PublicSettings>('/settings').pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.publicSettings.set(response.data);
        }
        this.isLoaded.set(true);
      }),
      catchError((err) => {
        // Silently fail — components will use static fallback
        this.isLoaded.set(true);
        return of({ success: false, data: undefined, message: 'Failed to load settings' } as ApiResponse<PublicSettings>);
      })
    );
  }

  /**
   * Convenience getter — returns current phone or null if empty.
   */
  getPhone(): string | null {
    const phone = this.publicSettings()?.contact?.phone;
    return phone && phone.trim() !== '' ? phone : null;
  }

  /**
   * Convenience getter — returns current address as a single line.
   */
  getAddressLine(): string | null {
    const a = this.publicSettings()?.contact?.address;
    if (!a) return null;
    const parts = [a.street, a.city, a.postalCode, a.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Returns a human-readable opening hours summary for a given day.
   */
  getOpeningHoursForDay(day: string): string {
    const oh = this.publicSettings()?.openingHours ?? [];
    const entry = oh.find((h) => h.day === day);
    if (!entry || !entry.isOpen) return 'Fermé';
    if (entry.slots.length === 0) return 'Ouvert';
    return entry.slots.map((s) => `${s.open} – ${s.close}`).join(', ');
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  /**
   * GET /api/settings/admin
   * Full settings for admin panel.
   */
  getAdminSettings(): Observable<ApiResponse<RestaurantSettings>> {
    return this.http.get<RestaurantSettings>('/settings/admin');
  }

  /**
   * PUT /api/settings/admin
   * Partial or full update via upsert.
   */
  updateSettings(data: Partial<RestaurantSettings>): Observable<ApiResponse<RestaurantSettings>> {
    return this.http.put<RestaurantSettings>('/settings/admin', data).pipe(
      tap((response) => {
        // Refresh cached public settings on successful save
        if (response.success) {
          this.loadPublicSettings().subscribe();
        }
      })
    );
  }
}
