import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService, PublicReservationResponse } from '../../core/services/reservation.service';
import { CreateReservationDto } from '../../core/models/reservation.model';
import { SettingsService, PublicSettings } from '../../core/services/settings.service';

type FormStep = 'form' | 'submitting' | 'success' | 'error';

interface ReservationForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  specialRequest: string;
}

@Component({
  selector: 'app-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-white">

      <!-- Hero Banner -->
      <div class="relative bg-dark-950 py-24 px-4 text-center">
        <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=600&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div class="relative z-10">
          <p class="text-primary-400 font-sans text-sm tracking-widest uppercase mb-3">BIZZ'ART Monastir</p>
          <h1 class="text-4xl md:text-5xl font-display font-bold text-white mb-4">Réserver une Table</h1>
          <p class="text-dark-300 text-lg max-w-xl mx-auto">
            Une expérience culinaire unique vous attend. Réservez votre table dès maintenant.
          </p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="container-custom py-16 px-4">
        <div class="max-w-2xl mx-auto">

          <!-- SUCCESS STATE -->
          @if (step() === 'success' && confirmedReservation()) {
            <div class="text-center py-12">
              <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 class="text-3xl font-display font-bold text-dark-900 mb-4">Réservation envoyée !</h2>
              <p class="text-dark-600 mb-2">
                Merci <strong>{{ confirmedReservation()!.customer.firstName }}</strong>, votre demande a bien été reçue.
              </p>
              <p class="text-dark-500 text-sm mb-8">
                Nous confirmerons votre réservation dans les plus brefs délais par email ou téléphone.
              </p>

              <div class="bg-dark-50 rounded-2xl p-6 text-left mb-8">
                <h3 class="font-semibold text-dark-900 mb-4 text-center">Récapitulatif</h3>
                <dl class="space-y-3">
                  <div class="flex justify-between">
                    <dt class="text-dark-500">Date</dt>
                    <dd class="font-medium text-dark-900">{{ formatDate(confirmedReservation()!.date) }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-dark-500">Heure</dt>
                    <dd class="font-medium text-dark-900">{{ confirmedReservation()!.time }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-dark-500">Nombre de personnes</dt>
                    <dd class="font-medium text-dark-900">{{ confirmedReservation()!.guests }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-dark-500">Statut</dt>
                    <dd>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        En attente de confirmation
                      </span>
                    </dd>
                  </div>
                  @if (confirmedReservation()!._id) {
                    <div class="flex justify-between items-start">
                      <dt class="text-dark-500">Référence</dt>
                      <dd class="font-mono text-xs text-dark-600 break-all max-w-[60%] text-right">{{ confirmedReservation()!._id }}</dd>
                    </div>
                  }
                </dl>
              </div>

              <button (click)="resetForm()" class="btn-primary" type="button">
                Faire une nouvelle réservation
              </button>
            </div>
          }

          <!-- ERROR STATE -->
          @if (step() === 'error') {
            <div class="text-center py-8">
              <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 class="text-2xl font-display font-bold text-dark-900 mb-3">Une erreur est survenue</h2>
              <p class="text-dark-600 mb-6">{{ errorMessage() }}</p>
              <button (click)="step.set('form')" class="btn-primary" type="button">Réessayer</button>
            </div>
          }

          <!-- FORM STATE -->
          @if (step() === 'form' || step() === 'submitting') {
            <div>
              <div class="text-center mb-10">
                <h2 class="text-2xl font-display font-semibold text-dark-900 mb-2">Vos informations</h2>
                <p class="text-dark-500 text-sm">Tous les champs marqués * sont obligatoires.</p>
              </div>

              <form (ngSubmit)="onSubmit()" #reservationForm="ngForm" novalidate>
                <!-- Nom / Prénom -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label for="firstName" class="form-label">Prénom *</label>
                    <input id="firstName" name="firstName" type="text"
                      [(ngModel)]="form.firstName" required minlength="2" maxlength="50"
                      class="form-input" [class.border-red-400]="firstNameField?.invalid && firstNameField?.touched"
                      #firstNameField="ngModel" autocomplete="given-name" placeholder="Votre prénom" />
                    @if (firstNameField.invalid && firstNameField.touched) {
                      <p class="form-error">Le prénom est obligatoire (2–50 caractères)</p>
                    }
                  </div>
                  <div>
                    <label for="lastName" class="form-label">Nom *</label>
                    <input id="lastName" name="lastName" type="text"
                      [(ngModel)]="form.lastName" required minlength="2" maxlength="50"
                      class="form-input" [class.border-red-400]="lastNameField?.invalid && lastNameField?.touched"
                      #lastNameField="ngModel" autocomplete="family-name" placeholder="Votre nom" />
                    @if (lastNameField.invalid && lastNameField.touched) {
                      <p class="form-error">Le nom est obligatoire (2–50 caractères)</p>
                    }
                  </div>
                </div>

                <!-- Email -->
                <div class="mb-4">
                  <label for="email" class="form-label">Email *</label>
                  <input id="email" name="email" type="email"
                    [(ngModel)]="form.email" required email maxlength="100"
                    class="form-input" [class.border-red-400]="emailField?.invalid && emailField?.touched"
                    #emailField="ngModel" autocomplete="email" placeholder="votre@email.com" />
                  @if (emailField.invalid && emailField.touched) {
                    <p class="form-error">Veuillez saisir une adresse email valide</p>
                  }
                </div>

                <!-- Téléphone -->
                <div class="mb-4">
                  <label for="phone" class="form-label">Téléphone *</label>
                  <input id="phone" name="phone" type="tel"
                    [(ngModel)]="form.phone" required pattern="^\\+?[\\d\\s\\-().]{7,20}$"
                    class="form-input" [class.border-red-400]="phoneField?.invalid && phoneField?.touched"
                    #phoneField="ngModel" autocomplete="tel" placeholder="+216 XX XXX XXX" />
                  @if (phoneField.invalid && phoneField.touched) {
                    <p class="form-error">Veuillez saisir un numéro de téléphone valide</p>
                  }
                </div>

                <!-- Date / Heure -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label for="date" class="form-label">Date *</label>
                    <input id="date" name="date" type="date"
                      [(ngModel)]="form.date" required [min]="minDate()" [max]="maxDate()"
                      class="form-input" [class.border-red-400]="dateField?.invalid && dateField?.touched"
                      #dateField="ngModel" />
                    @if (dateField.invalid && dateField.touched) {
                      <p class="form-error">Veuillez sélectionner une date valide</p>
                    }
                  </div>
                  <div>
                    <label for="time" class="form-label">Heure *</label>
                    <select id="time" name="time" [(ngModel)]="form.time" required
                      class="form-input" [class.border-red-400]="timeField?.invalid && timeField?.touched"
                      #timeField="ngModel">
                      <option value="">Choisir une heure</option>
                      @for (slot of timeSlots(); track slot) {
                        <option [value]="slot">{{ slot }}</option>
                      }
                    </select>
                    @if (timeField.invalid && timeField.touched) {
                      <p class="form-error">Veuillez sélectionner une heure</p>
                    }
                  </div>
                </div>

                <!-- Nombre de personnes -->
                <div class="mb-4">
                  <label for="guests" class="form-label">Nombre de personnes *</label>
                  <select id="guests" name="guests" [(ngModel)]="form.guests" required
                    class="form-input" [class.border-red-400]="guestsField?.invalid && guestsField?.touched"
                    #guestsField="ngModel">
                    <option [value]="0">Sélectionner</option>
                    @for (n of guestOptions(); track n) {
                      <option [value]="n">{{ n }} {{ n === 1 ? 'personne' : 'personnes' }}</option>
                    }
                  </select>
                  @if (guestsField.invalid && guestsField.touched) {
                    <p class="form-error">Veuillez sélectionner le nombre de personnes</p>
                  }
                </div>

                <!-- Note / demande spéciale -->
                <div class="mb-8">
                  <label for="specialRequest" class="form-label">
                    Message / demande spéciale
                    <span class="text-dark-400 font-normal ml-1">(optionnel)</span>
                  </label>
                  <textarea id="specialRequest" name="specialRequest"
                    [(ngModel)]="form.specialRequest" maxlength="1000" rows="4"
                    class="form-input resize-none"
                    placeholder="Allergies, occasion spéciale, préférences de placement..."></textarea>
                  <p class="text-xs text-dark-400 mt-1 text-right">{{ form.specialRequest.length }}/1000</p>
                </div>

                <!-- Validation errors from API -->
                @if (apiErrors().length > 0) {
                  <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <ul class="list-disc list-inside space-y-1">
                      @for (err of apiErrors(); track err) {
                        <li class="text-red-700 text-sm">{{ err }}</li>
                      }
                    </ul>
                  </div>
                }

                <!-- Submit -->
                <button type="submit" class="btn-primary w-full"
                  [disabled]="step() === 'submitting' || reservationForm.invalid || form.guests === 0">
                  @if (step() === 'submitting') {
                    <span class="flex items-center justify-center gap-2">
                      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Envoi en cours...
                    </span>
                  } @else {
                    Confirmer la réservation
                  }
                </button>

                <p class="text-center text-xs text-dark-400 mt-4">
                  Votre réservation sera confirmée par téléphone ou email dans les 24h.
                </p>
              </form>
            </div>
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    .btn-primary {
      @apply bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed
             text-white font-semibold py-3 px-8 rounded-xl transition-colors duration-200;
    }
    .form-label  { @apply block text-sm font-medium text-dark-700 mb-1.5; }
    .form-input  {
      @apply w-full px-4 py-3 border border-dark-200 rounded-xl text-dark-900
             focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
             transition-colors duration-200 bg-white;
    }
    .form-error  { @apply text-red-600 text-xs mt-1; }
  `]
})
export class ReservationComponent implements OnInit {

  // ─── State ───────────────────────────────────────────────────────────────────
  step = signal<FormStep>('form');
  confirmedReservation = signal<PublicReservationResponse | null>(null);
  errorMessage = signal<string>('');
  apiErrors = signal<string[]>([]);

  form: ReservationForm = {
    firstName: '', lastName: '', email: '', phone: '',
    date: '', time: '', guests: 0, specialRequest: '',
  };

  // ─── Dynamic options from SettingsService ────────────────────────────────────

  /** Time slots derived from opening hours + timeSlotDuration, fallback 12:00–22:30 */
  timeSlots = signal<string[]>(this.buildDefaultSlots());

  /** Guest range from reservationSettings, fallback 1–20 */
  guestOptions = signal<number[]>(Array.from({ length: 20 }, (_, i) => i + 1));

  constructor(
    private reservationService: ReservationService,
    private settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    const cached = this.settingsService.publicSettings();
    if (cached) {
      this.applySettings(cached);
    } else {
      this.settingsService.loadPublicSettings().subscribe(() => {
        const loaded = this.settingsService.publicSettings();
        if (loaded) this.applySettings(loaded);
      });
    }
  }

  private applySettings(s: PublicSettings): void {
    if (!s) return;
    const rs = s.reservationSettings;

    // Guest range
    const maxG: number = rs?.maxGuestsPerReservation ?? 20;
    const minG: number = rs?.minGuestsPerReservation ?? 1;
    this.guestOptions.set(Array.from({ length: maxG - minG + 1 }, (_, i) => i + minG));

    // Time slots from opening hours
    const slots = this.buildSlotsFromSettings(s);
    this.timeSlots.set(slots.length > 0 ? slots : this.buildDefaultSlots());
  }

  private buildSlotsFromSettings(s: PublicSettings): string[] {
    const rs = s?.reservationSettings;
    const duration: number = rs?.timeSlotDuration ?? 30;
    const oh = s?.openingHours ?? [];

    if (!oh.length) return [];

    const slotsSet = new Set<string>();
    for (const day of oh) {
      if (!day.isOpen) continue;
      for (const slot of day.slots) {
        const [openH, openM]   = slot.open.split(':').map(Number);
        const [closeH, closeM] = slot.close.split(':').map(Number);
        let current = openH * 60 + openM;
        const end   = closeH * 60 + closeM;
        while (current < end) {
          const h = Math.floor(current / 60);
          const m = current % 60;
          slotsSet.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
          current += duration;
        }
      }
    }
    return Array.from(slotsSet).sort();
  }

  private buildDefaultSlots(): string[] {
    const slots: string[] = [];
    for (let h = 12; h <= 22; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h < 22) slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push('22:30');
    return slots;
  }

  // ─── Date constraints (dynamic from settings) ────────────────────────────────

  minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  maxDate(): string {
    const s = this.settingsService.publicSettings();
    const days: number = s?.reservationSettings?.advanceBookingDays ?? 30;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  onSubmit(): void {
    this.apiErrors.set([]);
    if (this.form.guests === 0) return;

    const dto: CreateReservationDto = {
      customer: {
        firstName: this.form.firstName.trim(),
        lastName:  this.form.lastName.trim(),
        email:     this.form.email.trim().toLowerCase(),
        phone:     this.form.phone.trim(),
      },
      date:           this.form.date,
      time:           this.form.time,
      guests:         Number(this.form.guests),
      specialRequest: this.form.specialRequest.trim() || undefined,
    };

    this.step.set('submitting');

    this.reservationService.createReservation(dto).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.confirmedReservation.set(response.data);
          this.step.set('success');
        } else {
          this.errorMessage.set(response.message || 'Une erreur est survenue. Veuillez réessayer.');
          this.step.set('error');
        }
      },
      error: (err) => {
        if (err.error?.errors?.length) {
          this.apiErrors.set(err.error.errors.map((e: { message: string }) => e.message));
          this.step.set('form');
        } else {
          this.errorMessage.set(err.error?.message || 'Impossible de traiter votre réservation. Veuillez réessayer.');
          this.step.set('error');
        }
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  resetForm(): void {
    this.form = { firstName: '', lastName: '', email: '', phone: '', date: '', time: '', guests: 0, specialRequest: '' };
    this.confirmedReservation.set(null);
    this.apiErrors.set([]);
    this.step.set('form');
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }
}
