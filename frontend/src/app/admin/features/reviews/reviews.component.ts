import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../core/services/review.service';
import { Review } from '../../../core/models/review.model';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-display font-bold text-dark-900">Avis clients</h2>
        <span class="text-sm text-dark-500">{{ total() }} avis</span>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl border border-dark-100 p-4">
        <div class="flex flex-wrap gap-3 items-center">
          <select [(ngModel)]="filterApproved" (ngModelChange)="onFilterChange()" class="filter-input" aria-label="Filtrer par approbation">
            <option value="">Tous</option>
            <option value="true">Approuvés</option>
            <option value="false">En attente</option>
          </select>

          <select [(ngModel)]="filterPublished" (ngModelChange)="onFilterChange()" class="filter-input" aria-label="Filtrer par publication">
            <option value="">Toutes publications</option>
            <option value="true">Publiés</option>
            <option value="false">Non publiés</option>
          </select>

          <select [(ngModel)]="filterSource" (ngModelChange)="onFilterChange()" class="filter-input" aria-label="Filtrer par source">
            <option value="">Toutes les sources</option>
            <option value="google">Google</option>
            <option value="tripadvisor">TripAdvisor</option>
            <option value="facebook">Facebook</option>
            <option value="website">Site web</option>
          </select>

          @if (filterApproved || filterPublished || filterSource) {
            <button (click)="clearFilters()" class="text-sm text-primary-600 hover:text-primary-800 underline">
              Effacer
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
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{{ loadError() }}</div>
      }

      <!-- Mutation error -->
      @if (mutationError()) {
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center justify-between">
          <span>{{ mutationError() }}</span>
          <button (click)="mutationError.set('')" class="text-red-500 hover:text-red-700 ml-4 shrink-0" aria-label="Fermer">✕</button>
        </div>
      }

      <!-- Reviews list -->
      @if (!isLoading() && !loadError()) {
        @if (reviews().length === 0) {
          <div class="text-center py-16 text-dark-400">Aucun avis trouvé</div>
        } @else {
          <div class="space-y-4">
            @for (review of reviews(); track review._id) {
              <div class="bg-white rounded-xl border border-dark-100 p-5">
                <div class="flex items-start justify-between gap-4">

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                      <span class="font-semibold text-dark-900">{{ review.customerName }}</span>

                      <!-- Stars -->
                      <div class="flex gap-0.5" [attr.aria-label]="review.rating + ' étoiles sur 5'">
                        @for (filled of getStarArray(review.rating); track $index) {
                          <svg [class]="filled ? 'w-4 h-4 text-yellow-400 fill-current' : 'w-4 h-4 text-dark-200 fill-current'" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                        }
                      </div>

                      <span class="text-xs text-dark-400 capitalize bg-dark-50 px-2 py-0.5 rounded">{{ review.source }}</span>
                      <span class="text-xs text-dark-400">{{ formatDate(review.reviewDate) }}</span>
                    </div>

                    <p class="text-dark-600 text-sm leading-relaxed line-clamp-3">{{ review.reviewText }}</p>

                    <!-- Status badges -->
                    <div class="flex gap-2 mt-3">
                      <span [class]="review.isApproved ? 'badge-green' : 'badge-yellow'">
                        {{ review.isApproved ? 'Approuvé' : 'En attente' }}
                      </span>
                      <span [class]="review.isPublished ? 'badge-blue' : 'badge-gray'">
                        {{ review.isPublished ? 'Publié' : 'Non publié' }}
                      </span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex flex-col gap-1.5 shrink-0">
                    <!-- Approve + Publish -->
                    @if (!review.isPublished) {
                      <button
                        (click)="publish(review)"
                        [disabled]="updatingId() === review._id"
                        class="action-btn bg-green-100 text-green-800 hover:bg-green-200"
                      >
                        {{ review.isApproved ? 'Publier' : 'Approuver & Publier' }}
                      </button>
                    }
                    <!-- Unpublish -->
                    @if (review.isPublished) {
                      <button
                        (click)="unpublish(review)"
                        [disabled]="updatingId() === review._id"
                        class="action-btn bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      >
                        Dépublier
                      </button>
                    }
                    <!-- Refuser — toujours visible (un avis peut toujours être refusé) -->
                    <button
                      (click)="reject(review)"
                      [disabled]="updatingId() === review._id"
                      class="action-btn bg-red-100 text-red-800 hover:bg-red-200"
                    >
                      Refuser
                    </button>
                    <!-- Delete -->
                    <button
                      (click)="confirmDelete(review)"
                      [disabled]="updatingId() === review._id"
                      class="action-btn bg-dark-100 text-dark-700 hover:bg-dark-200"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between text-sm pt-2">
              <span class="text-dark-500">Page {{ currentPage() }} / {{ totalPages() }}</span>
              <div class="flex gap-2">
                <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                  class="px-3 py-1 rounded border border-dark-200 disabled:opacity-40 hover:bg-dark-50">←</button>
                <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                  class="px-3 py-1 rounded border border-dark-200 disabled:opacity-40 hover:bg-dark-50">→</button>
              </div>
            </div>
          }
        }
      }

      <!-- Delete confirm modal -->
      @if (reviewToDelete()) {
        <div
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          (click)="cancelDelete()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div class="bg-white rounded-2xl p-6 max-w-sm w-full" (click)="$event.stopPropagation()">
            <h3 id="delete-dialog-title" class="text-lg font-bold text-dark-900 mb-3">Supprimer l'avis ?</h3>
            <p class="text-dark-600 text-sm mb-6">
              Avis de <strong>{{ reviewToDelete()!.customerName }}</strong> — cette action est irréversible.
            </p>
            <div class="flex gap-3 justify-end">
              <button (click)="cancelDelete()" class="px-4 py-2 rounded-lg border border-dark-200 text-sm hover:bg-dark-50">
                Annuler
              </button>
              <button (click)="executeDelete()" class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">
                Supprimer
              </button>
            </div>
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
      @apply text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
             disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap;
    }
    .badge-green  { @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800; }
    .badge-yellow { @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800; }
    .badge-blue   { @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800; }
    .badge-gray   { @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-dark-100 text-dark-600; }
  `]
})
export class AdminReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);
  isLoading = signal(true);
  loadError = signal('');
  mutationError = signal('');  // feedback inline pour les erreurs de mutation
  updatingId = signal<string | undefined>(undefined);
  reviewToDelete = signal<Review | null>(null);
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);

  filterApproved = '';
  filterPublished = '';
  filterSource = '';

  constructor(private reviewService: ReviewService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.reviewService.getAdminReviews({
      isApproved:  this.filterApproved  !== '' ? this.filterApproved  === 'true' : undefined,
      isPublished: this.filterPublished !== '' ? this.filterPublished === 'true' : undefined,
      source:      this.filterSource    || undefined,
      page:        this.currentPage(),
      limit:       20,
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reviews.set(res.data.reviews);
          this.totalPages.set(res.data.pagination.totalPages);
          this.total.set(res.data.pagination.total);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les avis.');
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.load();
  }

  clearFilters(): void {
    this.filterApproved = '';
    this.filterPublished = '';
    this.filterSource = '';
    this.onFilterChange();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

  publish(review: Review): void {
    if (!review._id) return;
    this.mutationError.set('');
    this.updatingId.set(review._id);
    this.reviewService.publishReview(review._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reviews.update(list => list.map(r => r._id === review._id ? res.data! : r));
        } else {
          this.mutationError.set(res.message || 'Impossible de publier l\'avis.');
        }
        this.updatingId.set(undefined);
      },
      error: (err) => {
        this.mutationError.set(err?.error?.message || 'Erreur lors de la publication.');
        this.updatingId.set(undefined);
      },
    });
  }

  unpublish(review: Review): void {
    if (!review._id) return;
    this.mutationError.set('');
    this.updatingId.set(review._id);
    this.reviewService.updateReview(review._id, { isPublished: false }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reviews.update(list => list.map(r => r._id === review._id ? res.data! : r));
        } else {
          this.mutationError.set(res.message || 'Impossible de dépublier l\'avis.');
        }
        this.updatingId.set(undefined);
      },
      error: (err) => {
        this.mutationError.set(err?.error?.message || 'Erreur lors de la dépublication.');
        this.updatingId.set(undefined);
      },
    });
  }

  reject(review: Review): void {
    if (!review._id) return;
    this.mutationError.set('');
    this.updatingId.set(review._id);
    this.reviewService.rejectReview(review._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reviews.update(list => list.map(r => r._id === review._id ? res.data! : r));
        } else {
          this.mutationError.set(res.message || 'Impossible de refuser l\'avis.');
        }
        this.updatingId.set(undefined);
      },
      error: (err) => {
        this.mutationError.set(err?.error?.message || 'Erreur lors du refus.');
        this.updatingId.set(undefined);
      },
    });
  }

  confirmDelete(review: Review): void {
    this.reviewToDelete.set(review);
  }

  cancelDelete(): void {
    this.reviewToDelete.set(null);
  }

  executeDelete(): void {
    const review = this.reviewToDelete();
    if (!review?._id) return;
    this.mutationError.set('');
    this.updatingId.set(review._id);
    this.reviewToDelete.set(null);
    this.reviewService.deleteReview(review._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.reviews.update(list => list.filter(r => r._id !== review._id));
          const newTotal = this.total() - 1;
          this.total.set(newTotal);
          // Si la page courante est vide et qu'il y a des pages précédentes, reculer d'une page
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 20));
          if (this.currentPage() > newTotalPages) {
            this.currentPage.set(newTotalPages);
            this.load();
          } else {
            this.totalPages.set(newTotalPages);
          }
        } else {
          this.mutationError.set(res.message || 'Impossible de supprimer l\'avis.');
        }
        this.updatingId.set(undefined);
      },
      error: (err) => {
        this.mutationError.set(err?.error?.message || 'Erreur lors de la suppression.');
        this.updatingId.set(undefined);
      },
    });
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
