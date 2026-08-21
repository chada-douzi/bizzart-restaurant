import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ReviewService } from '../../../core/services/review.service';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface ReviewFormData {
  customerName: string;
  rating: number;
  reviewText: string;
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl shadow-lg border border-primary-100 p-8 md:p-10 max-w-2xl mx-auto">

      <!-- ── Success state ─────────────────────────────────────────────────── -->
      @if (submitState() === 'success') {
        <div class="text-center py-8 animate-fade-in" role="status" aria-live="polite">
          <div class="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-2xl font-display font-semibold text-dark-900 mb-3">
            Merci pour votre avis ❤️
          </h3>
          <p class="text-dark-600 leading-relaxed mb-1">
            Votre avis a bien été reçu.
          </p>
          <p class="text-dark-500 text-sm">
            Notre équipe va le vérifier avant sa publication.
          </p>
          <button
            type="button"
            (click)="reset()"
            class="mt-6 text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2 transition-colors"
          >
            Laisser un autre avis
          </button>
        </div>
      }

      <!-- ── Form ─────────────────────────────────────────────────────────── -->
      @if (submitState() !== 'success') {
        <div>
          <!-- Header -->
          <div class="mb-8">
            <h3 class="text-2xl md:text-3xl font-display font-bold text-dark-900 mb-2">
              Votre expérience
            </h3>
            <p class="text-dark-500 text-sm">
              Partagez votre avis sur BIZZ'ART — il sera vérifié avant publication.
            </p>
          </div>

          <!-- Error banner -->
          @if (submitState() === 'error') {
            <div
              class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
              role="alert"
              aria-live="assertive"
            >
              <svg class="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-red-700 text-sm leading-relaxed">{{ errorMessage() }}</p>
            </div>
          }

          <form
            #reviewForm="ngForm"
            (ngSubmit)="submit(reviewForm)"
            novalidate
            class="space-y-6"
          >

            <!-- Nom -->
            <div>
              <label for="customerName" class="block text-sm font-medium text-dark-700 mb-1.5">
                Votre nom <span class="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="customerName"
                type="text"
                name="customerName"
                [(ngModel)]="form.customerName"
                #nameField="ngModel"
                required
                minlength="2"
                maxlength="100"
                autocomplete="name"
                placeholder="Prénom et nom"
                class="w-full px-4 py-3 rounded-xl border text-dark-900 placeholder-dark-300
                       focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                [class.border-dark-200]="!(nameField.invalid && nameField.touched)"
                [class.border-red-400]="nameField.invalid && nameField.touched"
                [attr.aria-invalid]="nameField.invalid && nameField.touched"
                aria-describedby="nameError"
              />
              @if (nameField.invalid && nameField.touched) {
                <p id="nameError" class="mt-1.5 text-sm text-red-600" role="alert">
                  @if (nameField.errors?.['required']) { Le nom est obligatoire. }
                  @else if (nameField.errors?.['minlength']) { Le nom doit contenir au moins 2 caractères. }
                  @else if (nameField.errors?.['maxlength']) { Le nom ne peut pas dépasser 100 caractères. }
                </p>
              }
            </div>

            <!-- Note étoiles -->
            <div>
              <span class="block text-sm font-medium text-dark-700 mb-2">
                Note <span class="text-red-500" aria-hidden="true">*</span>
              </span>
              <div
                class="flex gap-1"
                role="group"
                [attr.aria-label]="'Note : ' + (form.rating > 0 ? form.rating + ' étoile' + (form.rating > 1 ? 's' : '') + ' sur 5' : 'aucune sélection')"
              >
                @for (star of [1, 2, 3, 4, 5]; track star) {
                  <button
                    type="button"
                    (click)="setRating(star)"
                    (mouseenter)="hoverRating.set(star)"
                    (mouseleave)="hoverRating.set(0)"
                    [attr.aria-label]="star + ' étoile' + (star > 1 ? 's' : '')"
                    [attr.aria-pressed]="form.rating === star"
                    class="p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
                           transition-transform hover:scale-110 active:scale-95"
                  >
                    <svg
                      class="w-9 h-9 transition-colors duration-100"
                      [class.text-yellow-400]="star <= displayRating()"
                      [class.fill-current]="star <= displayRating()"
                      [class.text-dark-200]="star > displayRating()"
                      [class.fill-current]="star > displayRating()"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  </button>
                }
              </div>
              @if (ratingTouched() && form.rating === 0) {
                <p class="mt-1.5 text-sm text-red-600" role="alert">
                  Veuillez sélectionner une note.
                </p>
              }
              @if (form.rating > 0) {
                <p class="mt-1 text-sm text-dark-500">
                  {{ ratingLabel() }}
                </p>
              }
            </div>

            <!-- Commentaire -->
            <div>
              <label for="reviewText" class="block text-sm font-medium text-dark-700 mb-1.5">
                Votre avis <span class="text-red-500" aria-hidden="true">*</span>
              </label>
              <textarea
                id="reviewText"
                name="reviewText"
                [(ngModel)]="form.reviewText"
                #textField="ngModel"
                required
                minlength="10"
                maxlength="2000"
                rows="5"
                placeholder="Décrivez votre expérience chez BIZZ'ART…"
                class="w-full px-4 py-3 rounded-xl border text-dark-900 placeholder-dark-300 resize-y
                       focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                [class.border-dark-200]="!(textField.invalid && textField.touched)"
                [class.border-red-400]="textField.invalid && textField.touched"
                [attr.aria-invalid]="textField.invalid && textField.touched"
                aria-describedby="textError textCount"
              ></textarea>
              <div class="flex justify-between items-start mt-1">
                @if (textField.invalid && textField.touched) {
                  <p id="textError" class="text-sm text-red-600" role="alert">
                    @if (textField.errors?.['required']) { Le commentaire est obligatoire. }
                    @else if (textField.errors?.['minlength']) { Minimum 10 caractères requis. }
                    @else if (textField.errors?.['maxlength']) { Maximum 2000 caractères. }
                  </p>
                } @else {
                  <span></span>
                }
                <span
                  id="textCount"
                  class="text-xs text-dark-400 shrink-0 ml-2"
                  [class.text-red-500]="form.reviewText.length > 1900"
                  aria-live="polite"
                >
                  {{ form.reviewText.length }}&thinsp;/&thinsp;2000
                </span>
              </div>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              [disabled]="submitState() === 'submitting'"
              class="w-full py-4 px-6 bg-dark-900 text-white font-semibold text-base rounded-xl
                     hover:bg-dark-800 active:bg-dark-950 transition-all duration-200
                     disabled:opacity-60 disabled:cursor-not-allowed
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
                     flex items-center justify-center gap-3"
            >
              @if (submitState() === 'submitting') {
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Envoi en cours…</span>
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Envoyer mon avis</span>
              }
            </button>

          </form>
        </div>
      }
    </div>
  `,
})
export class ReviewFormComponent {
  /** Emitted when a review is successfully submitted — parent can use it to refresh stats. */
  @Output() submitted = new EventEmitter<void>();

  // ── Form data ────────────────────────────────────────────────────────────────
  form: ReviewFormData = {
    customerName: '',
    rating: 0,
    reviewText: '',
  };

  // ── State ────────────────────────────────────────────────────────────────────
  submitState  = signal<SubmitState>('idle');
  errorMessage = signal('');
  hoverRating  = signal(0);
  ratingTouched = signal(false);

  /** Displays hover rating during mouse interaction, falls back to selected rating. */
  displayRating = computed(() => this.hoverRating() || this.form.rating);

  /** Human-readable label for the currently selected rating. */
  ratingLabel = computed(() => {
    const labels: Record<number, string> = {
      1: 'Mauvais',
      2: 'Peut mieux faire',
      3: 'Correct',
      4: 'Très bien',
      5: 'Excellent !',
    };
    return labels[this.form.rating] ?? '';
  });

  constructor(private reviewService: ReviewService) {}

  setRating(value: number): void {
    this.form.rating = value;
    this.ratingTouched.set(true);
  }

  submit(form: import('@angular/forms').NgForm): void {
    // Mark all fields as touched to trigger validation messages
    form.form.markAllAsTouched();
    this.ratingTouched.set(true);

    // Guard: rating must be selected and form must be valid
    if (this.form.rating === 0 || !form.valid) {
      return;
    }

    this.submitState.set('submitting');
    this.errorMessage.set('');

    this.reviewService.createReview({
      customerName: this.form.customerName.trim(),
      rating:       this.form.rating,
      reviewText:   this.form.reviewText.trim(),
      // source intentionally omitted — backend defaults to 'website'
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.submitState.set('success');
          this.submitted.emit();
        } else {
          this.submitState.set('error');
          this.errorMessage.set(res.message || 'Impossible d\'envoyer votre avis pour le moment. Veuillez réessayer.');
        }
      },
      error: (err) => {
        this.submitState.set('error');
        // Try to extract a backend validation message (422) or use a generic fallback
        const backendMsg: string | undefined = err?.error?.message || err?.error?.errors?.[0]?.message;
        this.errorMessage.set(
          backendMsg ?? 'Impossible d\'envoyer votre avis pour le moment. Veuillez réessayer.'
        );
      },
    });
  }

  reset(): void {
    this.form = { customerName: '', rating: 0, reviewText: '' };
    this.submitState.set('idle');
    this.errorMessage.set('');
    this.hoverRating.set(0);
    this.ratingTouched.set(false);
  }
}
