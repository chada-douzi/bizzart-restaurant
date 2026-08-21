import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { ReviewService } from '../../../core/services/review.service';
import { Review, ReviewStats } from '../../../core/models/review.model';
import { ReviewFormComponent } from './review-form.component';

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective, ReviewFormComponent],
  template: `
    <section id="reviews" class="py-20 lg:py-32 bg-accent-cream">
      <div class="container mx-auto px-4 lg:px-8">

        <!-- ── Section header ──────────────────────────────────────────────── -->
        <div class="text-center mb-16" appScrollReveal>
          <span class="text-primary-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
            Témoignages
          </span>
          <h2 class="text-4xl md:text-5xl font-display font-bold text-dark-900 mb-6">
            Ils Parlent de BIZZ'ART
          </h2>
          <div class="w-24 h-1 bg-primary-600 mx-auto mb-6"></div>
          <p class="text-lg text-dark-600 max-w-2xl mx-auto">
            L'avis de nos clients est notre plus belle récompense
          </p>
        </div>

        <!-- ── Rating stats ────────────────────────────────────────────────── -->
        @if (stats() && stats()!.totalReviews > 0) {
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14" appScrollReveal>
            <!-- Stars row -->
            <div class="flex items-center gap-1" [attr.aria-label]="'Note moyenne : ' + stats()!.averageRating + ' sur 5'">
              @for (star of getStarArray(stats()!.averageRating); track $index) {
                <svg
                  class="w-5 h-5"
                  [class.text-yellow-400]="star === 'full'"
                  [class.text-yellow-300]="star === 'half'"
                  [class.text-dark-200]="star === 'empty'"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              }
            </div>
            <span class="text-2xl font-display font-bold text-dark-900">
              {{ stats()!.averageRating | number:'1.1-1' }}
            </span>
            <span class="text-dark-500 text-sm">
              / 5 — basé sur {{ stats()!.totalReviews }} avis
            </span>
          </div>
        }

        <!-- ── Loading state ───────────────────────────────────────────────── -->
        @if (isLoading()) {
          <div class="max-w-3xl mx-auto flex justify-center py-16">
            <svg class="animate-spin w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        }

        <!-- ── Empty state ─────────────────────────────────────────────────── -->
        @if (!isLoading() && reviews().length === 0) {
          <div class="max-w-3xl mx-auto text-center py-12 text-dark-400" appScrollReveal>
            <p>Aucun avis disponible pour le moment.</p>
          </div>
        }

        <!-- ── Carousel ────────────────────────────────────────────────────── -->
        @if (!isLoading() && reviews().length > 0) {
          <div
            class="max-w-3xl mx-auto"
            appScrollReveal
            (keydown)="onKeydown($event)"
            tabindex="0"
            role="region"
            aria-label="Carrousel de témoignages"
            aria-live="polite"
          >
            <div class="relative bg-white rounded-2xl p-8 md:p-12 shadow-lg min-h-[280px] flex flex-col justify-center">
              <svg class="w-10 h-10 text-primary-200 mb-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.432.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              <div
                class="flex mb-4"
                [attr.aria-label]="'Note : ' + currentReview().rating + ' sur 5'"
              >
                @for (filled of getFilledStars(currentReview().rating); track $index) {
                  <svg
                    [class]="filled ? 'w-5 h-5 text-yellow-400 fill-current' : 'w-5 h-5 text-dark-200 fill-current'"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                }
              </div>

              <blockquote class="text-dark-700 text-lg md:text-xl leading-relaxed mb-8 italic">
                "{{ currentReview().reviewText }}"
              </blockquote>

              <div class="flex items-center justify-between">
                <div>
                  <p class="font-semibold text-dark-900">{{ currentReview().customerName }}</p>
                  <p class="text-sm text-dark-500 capitalize">{{ currentReview().source }}</p>
                </div>

                @if (reviews().length > 1) {
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      (click)="prev()"
                      class="w-10 h-10 rounded-full border border-dark-200 flex items-center justify-center
                             hover:bg-dark-900 hover:text-white hover:border-dark-900 transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                      aria-label="Témoignage précédent"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      (click)="next()"
                      class="w-10 h-10 rounded-full border border-dark-200 flex items-center justify-center
                             hover:bg-dark-900 hover:text-white hover:border-dark-900 transition-colors
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                      aria-label="Témoignage suivant"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                }
              </div>
            </div>

            @if (reviews().length > 1) {
              <div class="flex justify-center gap-2 mt-8" role="tablist" aria-label="Indicateurs de témoignages">
                @for (review of reviews(); track review._id; let i = $index) {
                  <button
                    type="button"
                    role="tab"
                    [attr.aria-selected]="currentIndex() === i"
                    [attr.aria-label]="'Aller au témoignage ' + (i + 1)"
                    (click)="goTo(i)"
                    class="h-2.5 rounded-full transition-all duration-300
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                    [class.bg-primary-600]="currentIndex() === i"
                    [class.bg-dark-300]="currentIndex() !== i"
                    [style.width]="currentIndex() === i ? '2rem' : '0.625rem'"
                  ></button>
                }
              </div>
            }
          </div>
        }

        <!-- ── Divider ─────────────────────────────────────────────────────── -->
        <div class="max-w-3xl mx-auto mt-16 mb-12" appScrollReveal>
          <div class="border-t border-primary-200"></div>
        </div>

        <!-- ── CTA toggle "Laisser un avis" ───────────────────────────────── -->
        <div class="text-center" appScrollReveal>
          @if (!showForm()) {
            <div>
              <p class="text-dark-600 text-lg mb-4">
                Vous avez apprécié votre expérience ?
              </p>
              <button
                type="button"
                (click)="openForm()"
                class="inline-flex items-center gap-2 px-8 py-4 bg-dark-900 text-white font-semibold
                       rounded-xl hover:bg-dark-800 transition-all duration-200 shadow-lg
                       hover:shadow-xl transform hover:scale-105
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                Laisser un avis
              </button>
            </div>
          }
        </div>

        <!-- ── Inline review form ──────────────────────────────────────────── -->
        @if (showForm()) {
          <div class="max-w-2xl mx-auto mt-4 animate-slide-up" appScrollReveal>
            <app-review-form
              (submitted)="onReviewSubmitted()"
            />
            <div class="text-center mt-4">
              <button
                type="button"
                (click)="closeForm()"
                class="text-sm text-dark-400 hover:text-dark-600 transition-colors underline underline-offset-2"
              >
                Annuler
              </button>
            </div>
          </div>
        }

      </div>
    </section>
  `,
})
export class TestimonialsSectionComponent implements OnInit, OnDestroy {
  // ── State ────────────────────────────────────────────────────────────────────
  reviews      = signal<Review[]>([]);
  stats        = signal<ReviewStats | null>(null);
  currentIndex = signal(0);
  isLoading    = signal(true);
  showForm     = signal(false);

  private autoplayInterval?: ReturnType<typeof setInterval>;
  private reducedMotion = false;

  constructor(private reviewService: ReviewService) {}

  currentReview(): Review {
    return this.reviews()[this.currentIndex()];
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.loadReviews();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  private loadReviews(): void {
    this.reviewService.getPublicReviews({ limit: 10 }).subscribe({
      next: (response) => {
        if (response.success && response.data?.reviews?.length) {
          this.reviews.set(response.data.reviews);
          this.startAutoplay();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private loadStats(): void {
    this.reviewService.getReviewStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats.set(response.data);
        }
      },
      error: () => { /* silently ignore — stats are non-critical */ },
    });
  }

  private startAutoplay(): void {
    if (!this.reducedMotion && this.reviews().length > 1) {
      this.autoplayInterval = setInterval(() => this.next(), 8000);
    }
  }

  private stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = undefined;
    }
  }

  // ── Carousel navigation ───────────────────────────────────────────────────────

  @HostListener('mouseenter')
  pauseAutoplay(): void {
    this.stopAutoplay();
  }

  @HostListener('mouseleave')
  resumeAutoplay(): void {
    if (!this.reducedMotion && !this.autoplayInterval && this.reviews().length > 1) {
      this.autoplayInterval = setInterval(() => this.next(), 8000);
    }
  }

  prev(): void {
    if (this.reviews().length <= 1) return;
    this.currentIndex.set((this.currentIndex() - 1 + this.reviews().length) % this.reviews().length);
  }

  next(): void {
    if (this.reviews().length <= 1) return;
    this.currentIndex.set((this.currentIndex() + 1) % this.reviews().length);
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft')  { event.preventDefault(); this.prev(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); this.next(); }
  }

  // ── Form toggle ───────────────────────────────────────────────────────────────

  openForm(): void {
    this.showForm.set(true);
    // Give the DOM a tick to render, then scroll the form into view
    setTimeout(() => {
      document.querySelector('app-review-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  /** Called when the form emits a successful submission. */
  onReviewSubmitted(): void {
    // Refresh stats so the count updates immediately
    this.loadStats();
    // Leave the form visible so the success message is shown.
    // The form resets itself internally after the user clicks "Laisser un autre avis".
  }

  // ── Star helpers ──────────────────────────────────────────────────────────────

  /** Returns boolean[] for simple filled/empty star rendering (carousel). */
  getFilledStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  /**
   * Returns 'full' | 'half' | 'empty' for each of the 5 star positions.
   * Used for the aggregate stats display (supports half-star rendering).
   */
  getStarArray(average: number): ('full' | 'half' | 'empty')[] {
    return Array(5).fill(null).map((_, i) => {
      const pos = i + 1;
      if (average >= pos) return 'full';
      if (average >= pos - 0.5) return 'half';
      return 'empty';
    });
  }
}
