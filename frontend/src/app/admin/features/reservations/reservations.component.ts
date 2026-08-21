import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ReservationService,
  PaginatedReservations,
  UpdateStatusDto,
} from '../../../core/services/reservation.service';
import { Reservation, ReservationStatus } from '../../../core/models/reservation.model';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-display font-bold text-dark-900">Réservations</h2>
        <span class="text-sm text-dark-500">{{ totalReservations() }} réservation(s)</span>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl border border-dark-100 p-4">
        <div class="flex flex-wrap gap-3 items-center">
          <!-- Status filter -->
          <select
            [(ngModel)]="statusFilter"
            (ngModelChange)="onFilterChange()"
            class="filter-input"
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmées</option>
            <option value="cancelled">Annulées</option>
            <option value="completed">Terminées</option>
            <option value="rejected">Refusées</option>
          </select>

          <!-- Date filter -->
          <input
            type="date"
            [(ngModel)]="dateFilter"
            (ngModelChange)="onFilterChange()"
            class="filter-input"
            aria-label="Filtrer par date"
          />

          <!-- Clear filters -->
          @if (statusFilter || dateFilter) {
            <button
              (click)="clearFilters()"
              class="text-sm text-primary-600 hover:text-primary-800 underline"
            >
              Effacer les filtres
            </button>
          }
        </div>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <svg class="animate-spin w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      }

      <!-- Error -->
      @if (loadError()) {
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {{ loadError() }}
        </div>
      }

      <!-- Mutation error (changeStatus) -->
      @if (mutationError()) {
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center justify-between">
          <span>{{ mutationError() }}</span>
          <button (click)="mutationError.set('')" class="text-red-500 hover:text-red-700 ml-4 shrink-0" aria-label="Fermer">✕</button>
        </div>
      }

      <!-- Table -->
      @if (!isLoading() && !loadError()) {
        @if (reservations().length === 0) {
          <div class="text-center py-16 text-dark-400">
            <p class="text-lg">Aucune réservation trouvée</p>
          </div>
        } @else {
          <div class="bg-white rounded-xl border border-dark-100 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm" role="table">
                <thead class="bg-dark-50 text-dark-600 uppercase text-xs tracking-wider">
                  <tr>
                    <th class="px-4 py-3 text-left font-semibold">Client</th>
                    <th class="px-4 py-3 text-left font-semibold">Date & Heure</th>
                    <th class="px-4 py-3 text-left font-semibold">Pers.</th>
                    <th class="px-4 py-3 text-left font-semibold">Statut</th>
                    <th class="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-100">
                  @for (r of reservations(); track r._id) {
                    <tr class="hover:bg-dark-50 transition-colors">
                      <td class="px-4 py-3">
                        <div class="font-medium text-dark-900">
                          {{ r.customer.firstName }} {{ r.customer.lastName }}
                        </div>
                        <div class="text-dark-400 text-xs">{{ r.customer.email }}</div>
                        <div class="text-dark-400 text-xs">{{ r.customer.phone }}</div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="text-dark-900">{{ formatDate(r.date) }}</div>
                        <div class="text-dark-500 text-xs">{{ r.time }}</div>
                      </td>
                      <td class="px-4 py-3 text-dark-700">{{ r.guests }}</td>
                      <td class="px-4 py-3">
                        <span [class]="statusBadgeClass(r.status)">
                          {{ statusLabel(r.status) }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex flex-wrap gap-1">
                          <!-- Confirm -->
                          @if (r.status === 'pending') {
                            <button
                              (click)="changeStatus(r, 'confirmed')"
                              class="action-btn bg-green-100 text-green-800 hover:bg-green-200"
                              [disabled]="updatingId() === r._id"
                            >
                              Confirmer
                            </button>
                          }
                          <!-- Reject -->
                          @if (r.status === 'pending' || r.status === 'confirmed') {
                            <button
                              (click)="changeStatus(r, 'rejected')"
                              class="action-btn bg-red-100 text-red-800 hover:bg-red-200"
                              [disabled]="updatingId() === r._id"
                            >
                              Refuser
                            </button>
                          }
                          <!-- Cancel -->
                          @if (r.status === 'pending' || r.status === 'confirmed') {
                            <button
                              (click)="changeStatus(r, 'cancelled')"
                              class="action-btn bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              [disabled]="updatingId() === r._id"
                            >
                              Annuler
                            </button>
                          }
                          <!-- Complete -->
                          @if (r.status === 'confirmed') {
                            <button
                              (click)="changeStatus(r, 'completed')"
                              class="action-btn bg-blue-100 text-blue-800 hover:bg-blue-200"
                              [disabled]="updatingId() === r._id"
                            >
                              Terminée
                            </button>
                          }
                          <!-- Details -->
                          <button
                            (click)="openDetail(r)"
                            class="action-btn bg-dark-100 text-dark-700 hover:bg-dark-200"
                          >
                            Détails
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="px-4 py-3 border-t border-dark-100 flex items-center justify-between text-sm">
                <span class="text-dark-500">
                  Page {{ currentPage() }} sur {{ totalPages() }}
                </span>
                <div class="flex gap-2">
                  <button
                    (click)="goToPage(currentPage() - 1)"
                    [disabled]="currentPage() === 1"
                    class="px-3 py-1 rounded border border-dark-200 disabled:opacity-40 hover:bg-dark-50"
                  >←</button>
                  <button
                    (click)="goToPage(currentPage() + 1)"
                    [disabled]="currentPage() === totalPages()"
                    class="px-3 py-1 rounded border border-dark-200 disabled:opacity-40 hover:bg-dark-50"
                  >→</button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Detail Modal -->
      @if (selectedReservation()) {
        <div
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          (click)="closeDetail()"
          role="dialog"
          aria-modal="true"
          aria-label="Détails de la réservation"
        >
          <div
            class="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-display font-bold text-dark-900">Détails</h3>
              <button
                (click)="closeDetail()"
                class="text-dark-400 hover:text-dark-600"
                aria-label="Fermer"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            @if (detailError()) {
              <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                {{ detailError() }}
              </div>
            }

            <dl class="space-y-3 text-sm mb-6">
              <div class="flex justify-between">
                <dt class="text-dark-500">Client</dt>
                <dd class="text-dark-900 font-medium">
                  {{ selectedReservation()!.customer.firstName }} {{ selectedReservation()!.customer.lastName }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-dark-500">Email</dt>
                <dd class="text-dark-900">{{ selectedReservation()!.customer.email }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-dark-500">Téléphone</dt>
                <dd class="text-dark-900">{{ selectedReservation()!.customer.phone }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-dark-500">Date</dt>
                <dd class="text-dark-900">{{ formatDate(selectedReservation()!.date) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-dark-500">Heure</dt>
                <dd class="text-dark-900">{{ selectedReservation()!.time }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-dark-500">Personnes</dt>
                <dd class="text-dark-900">{{ selectedReservation()!.guests }}</dd>
              </div>
              @if (selectedReservation()!.tableNumber) {
                <div class="flex justify-between">
                  <dt class="text-dark-500">Table</dt>
                  <dd class="text-dark-900">{{ selectedReservation()!.tableNumber }}</dd>
                </div>
              }
              @if (selectedReservation()!.specialRequest) {
                <div>
                  <dt class="text-dark-500 mb-1">Demande spéciale</dt>
                  <dd class="text-dark-900 bg-dark-50 rounded-lg p-3 text-sm">
                    {{ selectedReservation()!.specialRequest }}
                  </dd>
                </div>
              }
            </dl>

            <!-- Status History -->
            @if (selectedReservation()!.statusHistory?.length) {
              <div>
                <h4 class="font-semibold text-dark-800 mb-3 text-sm">Historique des statuts</h4>
                <ul class="space-y-2">
                  @for (entry of selectedReservation()!.statusHistory; track entry.changedAt) {
                    <li class="flex items-start gap-3 text-xs">
                      <span [class]="statusBadgeClass(asStatus(entry.status))" class="shrink-0 mt-0.5">
                        {{ statusLabel(asStatus(entry.status)) }}
                      </span>
                      <div>
                        <div class="text-dark-600">{{ formatDateTime(entry.changedAt) }}</div>
                        @if (entry.note) {
                          <div class="text-dark-500 italic">{{ entry.note }}</div>
                        }
                      </div>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .filter-input {
      @apply px-3 py-2 border border-dark-200 rounded-lg text-sm text-dark-700
             focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white;
    }
    .action-btn {
      @apply text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
    }
  `]
})
export class AdminReservationsComponent implements OnInit {
  // ─── State ──────────────────────────────────────────────────────────────────
  reservations = signal<Reservation[]>([]);
  isLoading = signal(false);
  loadError = signal('');
  updatingId = signal<string | undefined>(undefined);
  mutationError = signal('');   // feedback inline on changeStatus failure
  detailError = signal('');     // feedback on openDetail failure
  selectedReservation = signal<Reservation | null>(null);
  currentPage = signal(1);
  totalPages = signal(1);
  totalReservations = signal(0);

  // ─── Filters ─────────────────────────────────────────────────────────────────
  statusFilter: string = '';
  dateFilter: string = '';

  // Expose type for template
  readonly ReservationStatus = {} as Record<string, ReservationStatus>;

  constructor(private reservationService: ReservationService) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  // ─── Load ─────────────────────────────────────────────────────────────────────
  loadReservations(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.reservationService.getAdminReservations({
      status: this.statusFilter as ReservationStatus || undefined,
      date: this.dateFilter || undefined,
      page: this.currentPage(),
      limit: 20,
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.reservations.set(response.data.reservations);
          this.totalPages.set(response.data.pagination.totalPages);
          this.totalReservations.set(response.data.pagination.total);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les réservations.');
        this.isLoading.set(false);
      },
    });
  }

  // ─── Filters ─────────────────────────────────────────────────────────────────
  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadReservations();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.dateFilter = '';
    this.onFilterChange();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadReservations();
  }

  // ─── Status change ────────────────────────────────────────────────────────────
  changeStatus(reservation: Reservation, status: ReservationStatus): void {
    if (!reservation._id) return;
    this.mutationError.set('');
    this.updatingId.set(reservation._id);

    const dto: UpdateStatusDto = { status };

    this.reservationService.updateReservationStatus(reservation._id, dto).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Update in-place
          this.reservations.update(list =>
            list.map(r => r._id === reservation._id ? response.data! : r)
          );
          // Refresh detail if open
          if (this.selectedReservation()?._id === reservation._id) {
            this.selectedReservation.set(response.data);
          }
        } else {
          this.mutationError.set(response.message || 'Impossible de modifier le statut.');
        }
        this.updatingId.set(undefined);
      },
      error: (err) => {
        this.mutationError.set(err?.error?.message || 'Erreur lors de la modification du statut.');
        this.updatingId.set(undefined);
      },
    });
  }

  // ─── Detail modal ─────────────────────────────────────────────────────────────
  openDetail(reservation: Reservation): void {
    if (!reservation._id) return;
    this.detailError.set('');
    // Show basic info immediately while full details load
    this.selectedReservation.set(reservation);

    // Fetch full details with statusHistory
    this.reservationService.getAdminReservation(reservation._id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.selectedReservation.set(response.data);
        } else {
          this.detailError.set(response.message || 'Impossible de charger les détails.');
        }
      },
      error: (err) => {
        this.detailError.set(err?.error?.message || 'Erreur lors du chargement des détails.');
      },
    });
  }

  closeDetail(): void {
    this.selectedReservation.set(null);
    this.detailError.set('');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /** Safe cast for statusHistory entries — Angular templates don't support TypeScript 'as' casts */
  asStatus(status: string): ReservationStatus {
    return status as ReservationStatus;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  formatDateTime(date: string | Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  statusLabel(status: ReservationStatus): string {
    const labels: Record<ReservationStatus, string> = {
      pending:   'En attente',
      confirmed: 'Confirmée',
      cancelled: 'Annulée',
      completed: 'Terminée',
      rejected:  'Refusée',
    };
    return labels[status] ?? status;
  }

  statusBadgeClass(status: ReservationStatus): string {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ';
    const classes: Record<ReservationStatus, string> = {
      pending:   'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-700',
      completed: 'bg-blue-100 text-blue-800',
      rejected:  'bg-red-100 text-red-800',
    };
    return base + (classes[status] ?? 'bg-dark-100 text-dark-700');
  }
}
