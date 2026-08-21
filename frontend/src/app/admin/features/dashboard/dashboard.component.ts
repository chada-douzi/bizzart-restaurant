import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpService } from '../../../core/services/http.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ReservationStatus } from '../../../core/models/reservation.model';

// ─── Stats types (mirrors backend admin.controller.ts response) ──────────────

interface RecentReservation {
  _id: string;
  customer: { firstName: string; lastName: string };
  date: string | Date;
  time: string;
  guests: number;
  status: ReservationStatus;
  createdAt: Date;
}

interface RecentReview {
  _id: string;
  customerName: string;
  rating: number;
  reviewText: string;
  source: string;
  isApproved: boolean;
  isPublished: boolean;
  createdAt: Date;
}

interface AdminStats {
  reservations: {
    total: number;
    today: number;
    pending: number;
    confirmed: number;
    recent: RecentReservation[];
  };
  reviews: {
    total: number;
    pendingApproval: number;
    averageRating: number;
    recent: RecentReview[];
  };
  menu: {
    totalCategories: number;
    totalItems: number;
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8">

      <!-- Header -->
      <div>
        <h2 class="text-2xl font-display font-bold text-dark-900">Dashboard</h2>
        <p class="text-dark-500 text-sm mt-1">Vue d'ensemble de BIZZ'ART</p>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex justify-center py-16">
          <svg class="animate-spin w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center justify-between">
          <span>{{ error() }}</span>
          <button (click)="load()" class="text-red-600 underline text-xs ml-4">Réessayer</button>
        </div>
      }

      @if (!isLoading() && stats()) {
        <!-- KPI cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <!-- Réservations total -->
          <div class="bg-white rounded-xl border border-dark-100 p-5">
            <p class="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">Réservations</p>
            <p class="text-3xl font-bold text-dark-900">{{ stats()!.reservations.total }}</p>
            <p class="text-dark-400 text-xs mt-1">total</p>
          </div>

          <!-- Aujourd'hui -->
          <div class="bg-white rounded-xl border border-dark-100 p-5">
            <p class="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">Aujourd'hui</p>
            <p class="text-3xl font-bold text-primary-600">{{ stats()!.reservations.today }}</p>
            <p class="text-dark-400 text-xs mt-1">réservations du jour</p>
          </div>

          <!-- En attente -->
          <div class="bg-white rounded-xl border border-yellow-100 p-5">
            <p class="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">En attente</p>
            <p class="text-3xl font-bold text-yellow-600">{{ stats()!.reservations.pending }}</p>
            <p class="text-dark-400 text-xs mt-1">à confirmer</p>
          </div>

          <!-- Confirmées -->
          <div class="bg-white rounded-xl border border-green-100 p-5">
            <p class="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">Confirmées</p>
            <p class="text-3xl font-bold text-green-600">{{ stats()!.reservations.confirmed }}</p>
            <p class="text-dark-400 text-xs mt-1">actives</p>
          </div>

          <!-- Avis total -->
          <div class="bg-white rounded-xl border border-dark-100 p-5">
            <p class="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">Avis</p>
            <p class="text-3xl font-bold text-dark-900">{{ stats()!.reviews.total }}</p>
            <p class="text-dark-400 text-xs mt-1">soumis</p>
          </div>

          <!-- Avis en attente -->
          <div class="bg-white rounded-xl border border-orange-100 p-5">
            <p class="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">À modérer</p>
            <p class="text-3xl font-bold text-orange-500">{{ stats()!.reviews.pendingApproval }}</p>
            <p class="text-dark-400 text-xs mt-1">avis en attente</p>
          </div>

          <!-- Note moyenne -->
          <div class="bg-white rounded-xl border border-dark-100 p-5">
            <p class="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">Note moyenne</p>
            <div class="flex items-baseline gap-1">
              <p class="text-3xl font-bold text-dark-900">{{ stats()!.reviews.averageRating != null ? stats()!.reviews.averageRating : '—' }}</p>
              @if (stats()!.reviews.averageRating != null && stats()!.reviews.averageRating > 0) {
                <span class="text-yellow-400 text-lg">★</span>
              }
            </div>
            <p class="text-dark-400 text-xs mt-1">sur 5</p>
          </div>

          <!-- Menu -->
          <div class="bg-white rounded-xl border border-dark-100 p-5">
            <p class="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">Menu</p>
            <p class="text-3xl font-bold text-dark-900">{{ stats()!.menu.totalItems }}</p>
            <p class="text-dark-400 text-xs mt-1">plats · {{ stats()!.menu.totalCategories }} catégories</p>
          </div>
        </div>

        <!-- Quick actions -->
        @if (stats()!.reservations.pending > 0 || stats()!.reviews.pendingApproval > 0) {
          <div class="bg-primary-50 border border-primary-100 rounded-xl p-4 flex flex-wrap gap-3 items-center">
            <span class="text-primary-800 text-sm font-medium">Actions rapides :</span>
            @if (stats()!.reservations.pending > 0) {
              <a routerLink="/admin/reservations"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors">
                <span class="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {{ stats()!.reservations.pending }}
                </span>
                Réservation(s) à confirmer
              </a>
            }
            @if (stats()!.reviews.pendingApproval > 0) {
              <a routerLink="/admin/reviews"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg text-xs font-medium hover:bg-orange-200 transition-colors">
                <span class="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {{ stats()!.reviews.pendingApproval }}
                </span>
                Avis à modérer
              </a>
            }
          </div>
        }

        <!-- Recent reservations + recent reviews -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Recent reservations -->
          <div class="bg-white rounded-xl border border-dark-100 overflow-hidden">
            <div class="px-5 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 class="font-semibold text-dark-900 text-sm">Dernières réservations</h3>
              <a routerLink="/admin/reservations" class="text-primary-600 text-xs hover:underline">Voir tout</a>
            </div>

            @if (stats()!.reservations.recent.length === 0) {
              <div class="px-5 py-8 text-center text-dark-400 text-sm">Aucune réservation</div>
            } @else {
              <ul class="divide-y divide-dark-50">
                @for (r of stats()!.reservations.recent; track r._id) {
                  <li class="px-5 py-3 flex items-center justify-between gap-4">
                    <div class="min-w-0">
                      <p class="text-dark-900 text-sm font-medium truncate">
                        {{ r.customer.firstName }} {{ r.customer.lastName }}
                      </p>
                      <p class="text-dark-400 text-xs">
                        {{ formatDate(r.date) }} · {{ r.time }} · {{ r.guests }} pers.
                      </p>
                    </div>
                    <span [class]="statusBadge(r.status)" class="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium">
                      {{ statusLabel(r.status) }}
                    </span>
                  </li>
                }
              </ul>
            }
          </div>

          <!-- Recent reviews -->
          <div class="bg-white rounded-xl border border-dark-100 overflow-hidden">
            <div class="px-5 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 class="font-semibold text-dark-900 text-sm">Derniers avis</h3>
              <a routerLink="/admin/reviews" class="text-primary-600 text-xs hover:underline">Voir tout</a>
            </div>

            @if (stats()!.reviews.recent.length === 0) {
              <div class="px-5 py-8 text-center text-dark-400 text-sm">Aucun avis</div>
            } @else {
              <ul class="divide-y divide-dark-50">
                @for (rv of stats()!.reviews.recent; track rv._id) {
                  <li class="px-5 py-3">
                    <div class="flex items-start justify-between gap-3 mb-1">
                      <p class="text-dark-900 text-sm font-medium">{{ rv.customerName }}</p>
                      <div class="flex items-center gap-1 shrink-0">
                        @for (s of starArray(rv.rating); track $index) {
                          <span [class]="s ? 'text-yellow-400' : 'text-dark-200'" class="text-xs">★</span>
                        }
                        @if (!rv.isApproved) {
                          <span class="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">En attente</span>
                        }
                      </div>
                    </div>
                    <p class="text-dark-500 text-xs line-clamp-2">{{ rv.reviewText }}</p>
                  </li>
                }
              </ul>
            }
          </div>

        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  stats = signal<AdminStats | null>(null);
  isLoading = signal(true);
  error = signal('');

  constructor(private http: HttpService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set('');

    this.http.get<AdminStats>('/admin/stats').subscribe({
      next: (res: ApiResponse<AdminStats>) => {
        if (res.success && res.data) {
          this.stats.set(res.data);
        } else {
          this.error.set('Impossible de charger les statistiques.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Erreur lors du chargement des statistiques.');
        this.isLoading.set(false);
      },
    });
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  starArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  statusLabel(status: ReservationStatus): string {
    const labels: Record<ReservationStatus, string> = {
      pending: 'En attente', confirmed: 'Confirmée',
      cancelled: 'Annulée', completed: 'Terminée', rejected: 'Refusée',
    };
    return labels[status] ?? status;
  }

  statusBadge(status: ReservationStatus): string {
    const map: Record<ReservationStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-dark-100 text-dark-600',
      completed: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-dark-100 text-dark-600';
  }
}
