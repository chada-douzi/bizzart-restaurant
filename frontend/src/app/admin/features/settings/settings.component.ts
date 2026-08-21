import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings.service';
import { RestaurantSettings, OpeningHours, DayOfWeek, RestaurantEvent } from '../../../core/models/settings.model';

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday:    'Lundi',
  tuesday:   'Mardi',
  wednesday: 'Mercredi',
  thursday:  'Jeudi',
  friday:    'Vendredi',
  saturday:  'Samedi',
  sunday:    'Dimanche',
};

const ALL_DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 max-w-3xl">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-display font-bold text-dark-900">Paramètres du restaurant</h2>
        @if (lastSaved()) {
          <span class="text-xs text-green-600">✓ Sauvegardé</span>
        }
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

      @if (!isLoading()) {
        <!-- Error banner -->
        @if (errorMsg()) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{{ errorMsg() }}</div>
        }

        <!-- API Errors -->
        @if (apiErrors().length > 0) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-4">
            <ul class="list-disc list-inside space-y-1">
              @for (err of apiErrors(); track err) {
                <li class="text-red-700 text-sm">{{ err }}</li>
              }
            </ul>
          </div>
        }

        <form (ngSubmit)="onSave()" #settingsForm="ngForm" novalidate>

          <!-- ─ Section 1: General ─ -->
          <section class="card mb-6">
            <h3 class="section-title">Informations générales</h3>
            <div class="space-y-4">
              <div>
                <label class="form-label">Nom du restaurant</label>
                <input name="restaurantName" type="text" [(ngModel)]="form.restaurantName"
                  class="form-input" maxlength="100" placeholder="Ex: BIZZ'ART" />
              </div>
              <div>
                <label class="form-label">Description (Français)</label>
                <textarea name="descFr" [(ngModel)]="form.descriptionFr"
                  class="form-input resize-none" rows="3" maxlength="500"></textarea>
              </div>
            </div>
          </section>

          <!-- ─ Section 2: Contact ─ -->
          <section class="card mb-6">
            <h3 class="section-title">Contact</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="form-label">Téléphone</label>
                <input name="phone" type="tel" [(ngModel)]="form.phone" class="form-input"
                  placeholder="+216 XX XXX XXX" />
              </div>
              <div>
                <label class="form-label">Email</label>
                <input name="email" type="email" [(ngModel)]="form.email" class="form-input"
                  placeholder="contact@bizzart.com" />
              </div>
              <div class="sm:col-span-2">
                <label class="form-label">Adresse</label>
                <input name="street" type="text" [(ngModel)]="form.street" class="form-input"
                  placeholder="Rue, numéro..." maxlength="200" />
              </div>
              <div>
                <label class="form-label">Ville</label>
                <input name="city" type="text" [(ngModel)]="form.city" class="form-input"
                  placeholder="Monastir" maxlength="100" />
              </div>
              <div>
                <label class="form-label">Code postal</label>
                <input name="postalCode" type="text" [(ngModel)]="form.postalCode" class="form-input"
                  placeholder="5000" maxlength="20" />
              </div>
              <div>
                <label class="form-label">Pays</label>
                <input name="country" type="text" [(ngModel)]="form.country" class="form-input"
                  placeholder="Tunisia" maxlength="100" />
              </div>
              <div>
                <label class="form-label">
                  Latitude GPS
                  <span class="text-dark-400 font-normal text-xs ml-1">(Google Maps)</span>
                </label>
                <input name="lat" type="number" [(ngModel)]="form.lat" class="form-input"
                  step="0.000001" placeholder="35.7795" />
              </div>
              <div>
                <label class="form-label">Longitude GPS</label>
                <input name="lng" type="number" [(ngModel)]="form.lng" class="form-input"
                  step="0.000001" placeholder="10.8262" />
              </div>
            </div>
          </section>

          <!-- ─ Section 3: Opening Hours ─ -->
          <section class="card mb-6">
            <h3 class="section-title">Horaires d'ouverture</h3>
            <div class="space-y-3">
              @for (day of allDays; track day) {
                <div class="flex items-center gap-4 py-2 border-b border-dark-100 last:border-0">
                  <div class="w-24 shrink-0">
                    <span class="text-sm font-medium text-dark-700">{{ dayLabel(day) }}</span>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [ngModel]="isDayOpen(day)" (ngModelChange)="toggleDay(day, $event)"
                      [name]="'open_' + day" class="rounded" />
                    <span class="text-sm text-dark-600">Ouvert</span>
                  </label>
                  @if (isDayOpen(day)) {
                    <div class="flex items-center gap-2">
                      <input type="text" [ngModel]="getDaySlotOpen(day)"
                        (ngModelChange)="setDaySlot(day, 'open', $event)"
                        [name]="'slot_open_' + day"
                        class="form-input w-24 text-sm" placeholder="12:00"
                        pattern="^([01]\d|2[0-3]):[0-5]\d$" />
                      <span class="text-dark-400 text-sm">–</span>
                      <input type="text" [ngModel]="getDaySlotClose(day)"
                        (ngModelChange)="setDaySlot(day, 'close', $event)"
                        [name]="'slot_close_' + day"
                        class="form-input w-24 text-sm" placeholder="22:30"
                        pattern="^([01]\d|2[0-3]):[0-5]\d$" />
                    </div>
                  }
                </div>
              }
            </div>
          </section>

          <!-- ─ Section 4: Social Media ─ -->
          <section class="card mb-6">
            <h3 class="section-title">Réseaux sociaux</h3>
            <div class="space-y-4">
              <div>
                <label class="form-label">Instagram</label>
                <input name="instagram" type="url" [(ngModel)]="form.instagram" class="form-input"
                  placeholder="https://www.instagram.com/..." />
              </div>
              <div>
                <label class="form-label">Facebook</label>
                <input name="facebook" type="url" [(ngModel)]="form.facebook" class="form-input"
                  placeholder="https://www.facebook.com/..." />
              </div>
              <div>
                <label class="form-label">TikTok</label>
                <input name="tiktok" type="url" [(ngModel)]="form.tiktok" class="form-input"
                  placeholder="https://www.tiktok.com/..." />
              </div>
            </div>
          </section>

          <!-- ─ Section 4b: Branding ─ -->
          <section class="card mb-6">
            <h3 class="section-title">Branding & Images</h3>
            <p class="text-xs text-dark-400 mb-4">
              Renseignez les URLs Cloudinary de vos images (uploadez-les d'abord via la Galerie admin).
            </p>
            <div class="space-y-4">
              <div>
                <label class="form-label">
                  Image Hero (fond homepage)
                  <span class="text-dark-400 font-normal text-xs ml-1">— photo d'ambiance plein écran</span>
                </label>
                <input name="heroImage" type="url" [(ngModel)]="form.heroImage" class="form-input"
                  placeholder="https://res.cloudinary.com/..." />
                @if (form.heroImage) {
                  <img [src]="form.heroImage" alt="Aperçu hero"
                    class="mt-2 w-full h-32 object-cover rounded-lg" (error)="onImgError($event)" />
                }
              </div>
              <div>
                <label class="form-label">
                  Logo
                  <span class="text-dark-400 font-normal text-xs ml-1">— utilisé dans le header/footer</span>
                </label>
                <input name="logo" type="url" [(ngModel)]="form.logo" class="form-input"
                  placeholder="https://res.cloudinary.com/..." />
                @if (form.logo) {
                  <img [src]="form.logo" alt="Aperçu logo"
                    class="mt-2 h-16 object-contain rounded-lg" (error)="onImgError($event)" />
                }
              </div>
            </div>
          </section>

          <!-- ─ Section 5: Reservation Settings ─ -->          <section class="card mb-6">
            <h3 class="section-title">Paramètres de réservation</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="form-label">Couverts max par réservation</label>
                <input name="maxGuests" type="number" [(ngModel)]="form.maxGuests" class="form-input" min="1" max="100" />
              </div>
              <div>
                <label class="form-label">Couverts min par réservation</label>
                <input name="minGuests" type="number" [(ngModel)]="form.minGuests" class="form-input" min="1" />
              </div>
              <div>
                <label class="form-label">Réservations max par jour</label>
                <input name="maxDaily" type="number" [(ngModel)]="form.maxDailyReservations" class="form-input" min="1" />
              </div>
              <div>
                <label class="form-label">Réservation à l'avance (jours max)</label>
                <input name="advanceDays" type="number" [(ngModel)]="form.advanceBookingDays" class="form-input" min="1" max="365" />
              </div>
              <div>
                <label class="form-label">Durée d'un créneau (minutes)</label>
                <input name="slotDuration" type="number" [(ngModel)]="form.timeSlotDuration" class="form-input" min="15" max="120" />
              </div>
              <div class="flex items-center gap-3 pt-5">
                <input name="autoConfirm" type="checkbox" [(ngModel)]="form.autoConfirm" class="rounded" />
                <label class="text-sm font-medium text-dark-700">Confirmation automatique</label>
              </div>
            </div>
          </section>

          <!-- ─ Section 6: Events ─ -->
          <section class="card mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="section-title mb-0">Événements</h3>
              <button type="button" (click)="addEvent()" class="btn-primary text-xs px-3 py-1.5">
                + Ajouter
              </button>
            </div>
            @if (events.length === 0) {
              <p class="text-dark-400 text-sm text-center py-4">Aucun événement. Les événements statiques du site seront utilisés.</p>
            }
            <div class="space-y-6">
              @for (ev of events; track $index; let i = $index) {
                <div class="border border-dark-100 rounded-xl p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-dark-600">Événement {{ i + 1 }}</span>
                    <button type="button" (click)="removeEvent(i)"
                      class="text-xs text-red-500 hover:text-red-700 transition-colors">
                      Supprimer
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="form-label">Titre *</label>
                      <input type="text" [(ngModel)]="events[i].title" [name]="'evTitle_' + i"
                        class="form-input" maxlength="200" placeholder="Live Music" />
                    </div>
                    <div>
                      <label class="form-label">Date</label>
                      <input type="text" [(ngModel)]="events[i].date" [name]="'evDate_' + i"
                        class="form-input" placeholder="À venir / 2026-09-15" />
                    </div>
                    <div>
                      <label class="form-label">Heure</label>
                      <input type="text" [(ngModel)]="events[i].time" [name]="'evTime_' + i"
                        class="form-input" placeholder="20:00" />
                    </div>
                    <div>
                      <label class="form-label">Image URL</label>
                      <input type="url" [(ngModel)]="events[i].imageUrl" [name]="'evImg_' + i"
                        class="form-input" placeholder="https://res.cloudinary.com/..." />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="form-label">Description</label>
                      <textarea [(ngModel)]="events[i].description" [name]="'evDesc_' + i"
                        class="form-input resize-none" rows="2" maxlength="1000"></textarea>
                    </div>
                    <div class="flex items-center gap-2">
                      <input type="checkbox" [(ngModel)]="events[i].isVisible" [name]="'evVis_' + i" class="rounded" />
                      <label class="text-sm text-dark-700">Visible sur le site</label>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Save button -->
          <div class="flex justify-end">
            <button type="submit" class="btn-primary" [disabled]="isSaving()">
              @if (isSaving()) {
                <span class="flex items-center gap-2">
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Sauvegarde en cours...
                </span>
              } @else {
                Sauvegarder les paramètres
              }
            </button>
          </div>

        </form>
      }
    </div>
  `,
  styles: [`
    .card       { @apply bg-white rounded-xl border border-dark-100 p-6; }
    .section-title { @apply text-lg font-semibold text-dark-900 mb-4; }
    .form-label { @apply block text-sm font-medium text-dark-700 mb-1.5; }
    .form-input {
      @apply w-full px-4 py-2.5 border border-dark-200 rounded-xl text-dark-900 text-sm
             focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white;
    }
    .btn-primary {
      @apply bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed
             text-white font-semibold py-3 px-8 rounded-xl transition-colors;
    }
  `]
})
export class AdminSettingsComponent implements OnInit {
  isLoading = signal(true);
  isSaving  = signal(false);
  errorMsg  = signal('');
  apiErrors = signal<string[]>([]);
  lastSaved = signal(false);

  readonly allDays = ALL_DAYS;

  // Flat form model (easier to bind with ngModel)
  form = {
    restaurantName: '',
    descriptionFr: '',
    phone: '', email: '',
    street: '', city: '', postalCode: '', country: 'Tunisia',
    lat: 0, lng: 0,
    instagram: '', facebook: '', tiktok: '',
    maxGuests: 20, minGuests: 1,
    maxDailyReservations: 50, advanceBookingDays: 30,
    timeSlotDuration: 30, autoConfirm: false,
    // Branding
    logo: '',
    heroImage: '',
  };

  events: RestaurantEvent[] = [];

  // Opening hours keyed by day for easy access
  private openingHoursMap: Map<DayOfWeek, OpeningHours> = new Map();

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.settingsService.getAdminSettings().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.populateForm(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('Impossible de charger les paramètres.');
        this.isLoading.set(false);
      },
    });
  }

  private populateForm(s: RestaurantSettings): void {
    this.form.restaurantName    = s.restaurantName ?? '';
    this.form.descriptionFr     = s.description?.fr ?? '';
    this.form.phone             = s.contact?.phone ?? '';
    this.form.email             = s.contact?.email ?? '';
    this.form.street            = s.contact?.address?.street ?? '';
    this.form.city              = s.contact?.address?.city ?? '';
    this.form.postalCode        = s.contact?.address?.postalCode ?? '';
    this.form.country           = s.contact?.address?.country ?? 'Tunisia';
    this.form.lat               = s.contact?.coordinates?.lat ?? 0;
    this.form.lng               = s.contact?.coordinates?.lng ?? 0;
    this.form.instagram         = s.socialMedia?.instagram ?? '';
    this.form.facebook          = s.socialMedia?.facebook ?? '';
    this.form.tiktok            = s.socialMedia?.tiktok ?? '';
    this.form.maxGuests         = s.reservationSettings?.maxGuestsPerReservation ?? 20;
    this.form.minGuests         = s.reservationSettings?.minGuestsPerReservation ?? 1;
    this.form.maxDailyReservations = s.reservationSettings?.maxDailyReservations ?? 50;
    this.form.advanceBookingDays   = s.reservationSettings?.advanceBookingDays ?? 30;
    this.form.timeSlotDuration  = s.reservationSettings?.timeSlotDuration ?? 30;
    this.form.autoConfirm       = s.reservationSettings?.autoConfirm ?? false;
    this.form.logo              = s.branding?.logo ?? '';
    this.form.heroImage         = s.branding?.heroImage ?? '';
    this.events                 = s.events ? [...s.events] : [];

    // Populate opening hours map
    this.openingHoursMap.clear();
    for (const day of ALL_DAYS) {
      const existing = (s.openingHours ?? []).find((h) => h.day === day);
      this.openingHoursMap.set(day, existing ?? { day, isOpen: false, slots: [] });
    }
  }

  onSave(): void {
    this.apiErrors.set([]);
    this.errorMsg.set('');
    this.isSaving.set(true);
    this.lastSaved.set(false);

    const payload: Partial<RestaurantSettings> = {
      restaurantName: this.form.restaurantName,
      description: { fr: this.form.descriptionFr },
      contact: {
        phone: this.form.phone,
        email: this.form.email,
        address: {
          street: this.form.street,
          city: this.form.city,
          postalCode: this.form.postalCode,
          country: this.form.country,
        },
        // Preserve coordinates from the form — never hardcode 0,0
        coordinates: {
          lat: this.form.lat,
          lng: this.form.lng,
        },
      },
      openingHours: Array.from(this.openingHoursMap.values()),
      socialMedia: {
        instagram: this.form.instagram || undefined,
        facebook:  this.form.facebook  || undefined,
        tiktok:    this.form.tiktok    || undefined,
      },
      reservationSettings: {
        maxGuestsPerReservation:  this.form.maxGuests,
        minGuestsPerReservation:  this.form.minGuests,
        maxDailyReservations:     this.form.maxDailyReservations,
        advanceBookingDays:       this.form.advanceBookingDays,
        timeSlotDuration:         this.form.timeSlotDuration,
        autoConfirm:              this.form.autoConfirm,
      },
      branding: {
        logo:      this.form.logo      || undefined,
        heroImage: this.form.heroImage || undefined,
      },
      events: this.events,
    };

    this.settingsService.updateSettings(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.lastSaved.set(true);
          setTimeout(() => this.lastSaved.set(false), 4000);
        } else {
          this.errorMsg.set(res.message || 'Échec de la sauvegarde.');
        }
        this.isSaving.set(false);
      },
      error: (err) => {
        if (err.error?.errors?.length) {
          this.apiErrors.set(err.error.errors.map((e: { message: string }) => e.message));
        } else {
          this.errorMsg.set(err.error?.message || 'Erreur lors de la sauvegarde.');
        }
        this.isSaving.set(false);
      },
    });
  }

  // ─── Opening hours helpers ─────────────────────────────────────────────────
  dayLabel(day: DayOfWeek): string { return DAY_LABELS[day]; }

  isDayOpen(day: DayOfWeek): boolean {
    return this.openingHoursMap.get(day)?.isOpen ?? false;
  }

  toggleDay(day: DayOfWeek, isOpen: boolean): void {
    const current = this.openingHoursMap.get(day) ?? { day, isOpen: false, slots: [] };
    this.openingHoursMap.set(day, { ...current, isOpen });
  }

  getDaySlotOpen(day: DayOfWeek): string {
    return this.openingHoursMap.get(day)?.slots?.[0]?.open ?? '';
  }

  getDaySlotClose(day: DayOfWeek): string {
    return this.openingHoursMap.get(day)?.slots?.[0]?.close ?? '';
  }

  setDaySlot(day: DayOfWeek, field: 'open' | 'close', value: string): void {
    const current = this.openingHoursMap.get(day) ?? { day, isOpen: true, slots: [] };
    const slot = current.slots[0] ?? { open: '', close: '' };
    const updated = { ...slot, [field]: value };
    this.openingHoursMap.set(day, { ...current, slots: [updated] });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  // ─── Events helpers ────────────────────────────────────────────────────────
  addEvent(): void {
    this.events = [...this.events, { title: '', description: '', date: 'À venir', time: '', imageUrl: '', isVisible: true }];
  }

  removeEvent(index: number): void {
    this.events = this.events.filter((_, i) => i !== index);
  }
}
