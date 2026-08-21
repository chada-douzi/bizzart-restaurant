import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { SettingsService } from '../../../core/services/settings.service';
import { PublicSettings } from '../../../core/services/settings.service';

@Component({
  selector: 'app-location-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  template: `
    <section id="contact" class="py-20 lg:py-32 bg-white">
      <div class="container mx-auto px-4 lg:px-8">
        <div class="text-center mb-16" appScrollReveal>
          <h2 class="text-4xl md:text-5xl font-display font-bold text-dark-900 mb-6">Nous Trouver</h2>
          <div class="w-24 h-1 bg-primary-600 mx-auto mb-6"></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div class="space-y-10" appScrollReveal>

            <!-- Address -->
            @if (addressLine()) {
              <div class="group">
                <h3 class="text-2xl font-display font-semibold text-dark-900 mb-5 flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary-100">
                    <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span>Adresse</span>
                </h3>
                <p class="text-dark-600 text-lg leading-relaxed pl-13">{{ addressLine() }}</p>
              </div>
            }

            <!-- Phone -->
            @if (phone()) {
              <div class="group">
                <h3 class="text-2xl font-display font-semibold text-dark-900 mb-5 flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary-100">
                    <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <span>Téléphone</span>
                </h3>
                <a
                  [href]="telHref()"
                  class="inline-flex items-center gap-2 text-primary-600 text-xl font-semibold hover:text-primary-700 transition-all pl-13 group/phone"
                  aria-label="Appeler BIZZ'ART"
                >
                  <span class="border-b-2 border-transparent group-hover/phone:border-primary-600 transition-colors">{{ phone() }}</span>
                  <svg class="w-5 h-5 opacity-0 -translate-x-2 group-hover/phone:opacity-100 group-hover/phone:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>
            }

            <!-- Instagram -->
            @if (instagramUrl()) {
              <div class="group">
                <h3 class="text-2xl font-display font-semibold text-dark-900 mb-5 flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center flex-shrink-0 transition-all group-hover:from-purple-100 group-hover:to-pink-100 group-hover:scale-105">
                    <svg class="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <span>Instagram</span>
                </h3>
                <a
                  [href]="instagramUrl()!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-3 text-pink-600 text-xl font-semibold hover:text-pink-700 transition-all pl-13 group/insta"
                  aria-label="Suivez BIZZ'ART sur Instagram"
                >
                  <span class="border-b-2 border-transparent group-hover/insta:border-pink-600 transition-colors">@bizzart_monastir</span>
                  <svg class="w-5 h-5 opacity-0 -translate-x-2 group-hover/insta:opacity-100 group-hover/insta:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            }

            <!-- Opening hours -->
            @if (hasOpeningHours()) {
              <div class="group">
                <h3 class="text-2xl font-display font-semibold text-dark-900 mb-5 flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary-100">
                    <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Horaires</span>
                </h3>
                <dl class="space-y-3 pl-13">
                  @for (entry of openingHoursDisplay(); track entry.day) {
                    <div class="flex justify-between items-center text-dark-700 py-1 border-b border-dark-50 last:border-0">
                      <dt class="font-medium text-base">{{ entry.label }}</dt>
                      <dd 
                        class="text-base font-semibold transition-colors"
                        [class.text-dark-400]="!entry.isOpen"
                        [class.text-primary-600]="entry.isOpen"
                      >
                        {{ entry.hours }}
                      </dd>
                    </div>
                  }
                </dl>
              </div>
            }

            <!-- Action buttons -->
            <div class="flex flex-wrap gap-4 pt-4">
              @if (mapsHref()) {
                <a
                  [href]="mapsHref()!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  Itinéraire
                </a>
              } @else {
                <span
                  class="px-6 py-3 bg-dark-200 text-dark-500 rounded-lg font-semibold cursor-not-allowed"
                  aria-disabled="true"
                >
                  Itinéraire
                </span>
              }

              @if (telHref()) {
                <a
                  [href]="telHref()!"
                  class="px-6 py-3 bg-dark-900 text-white rounded-lg font-semibold hover:bg-dark-800 transition-colors"
                >
                  Appeler
                </a>
              } @else {
                <span
                  class="px-6 py-3 bg-dark-200 text-dark-500 rounded-lg font-semibold cursor-not-allowed"
                  aria-disabled="true"
                >
                  Appeler
                </span>
              }
            </div>
          </div>

          <!-- Carte Google Maps -->
          <div class="bg-dark-100 rounded-2xl overflow-hidden shadow-lg h-96" appScrollReveal>
            @if (hasCoordinates()) {
              <!-- Vraie iframe Google Maps avec les coordonnées du restaurant -->
              <iframe
                [src]="googleMapsEmbedUrl()!"
                width="100%"
                height="100%"
                style="border:0;"
                allowfullscreen
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                [title]="'Carte — ' + (addressLine() || 'BIZZ\\'ART')"
                class="w-full h-full"
              ></iframe>
            } @else {
              <!-- Fallback propre si pas de coordonnées configurées -->
              <div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-8 text-center">
                <svg class="w-16 h-16 text-primary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                @if (addressLine()) {
                  <p class="text-dark-700 font-semibold mb-2">{{ addressLine() }}</p>
                  <a
                    [href]="mapsHref()!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary-600 text-sm hover:text-primary-700 underline transition-colors"
                  >
                    Voir sur Google Maps →
                  </a>
                } @else {
                  <p class="text-dark-500 text-sm">Adresse disponible prochainement</p>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class LocationSectionComponent implements OnInit {
  private settings = signal<PublicSettings | null>(null);

  readonly phone = computed(() => {
    const p = this.settings()?.contact?.phone;
    return p && p.trim() !== '' ? p : null;
  });

  readonly telHref = computed(() => {
    const p = this.phone();
    if (!p) return null;
    return `tel:${p.replace(/[\s\-().]/g, '')}`;
  });

  readonly instagramUrl = computed((): string | null => {
    const url = this.settings()?.socialMedia?.instagram;
    return url && url.trim() !== '' ? url : null;
  });

  readonly addressLine = computed(() => {
    const a = this.settings()?.contact?.address;
    if (!a) return null;
    const parts = [a.street, a.city, a.country].filter(s => s && s.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : null;
  });

  readonly mapsHref = computed((): string | null => {
    const addr = this.addressLine();
    if (!addr) return null;
    return `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
  });

  readonly hasCoordinates = computed(() => {
    const c = this.settings()?.contact?.coordinates;
    return !!(c && c.lat !== 0 && c.lng !== 0);
  });

  /** Safe URL for Google Maps embed iframe */
  readonly googleMapsEmbedUrl = computed((): SafeResourceUrl | null => {
    const c = this.settings()?.contact?.coordinates;
    if (!c || c.lat === 0 || c.lng === 0) return null;
    const url = `https://maps.google.com/maps?q=${c.lat},${c.lng}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  readonly hasOpeningHours = computed(() =>
    (this.settings()?.openingHours ?? []).length > 0
  );

  readonly openingHoursDisplay = computed(() => {
    const oh = this.settings()?.openingHours ?? [];
    const dayLabels: Record<string, string> = {
      monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
      thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche',
    };
    const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return order
      .map(day => {
        const entry = oh.find(h => h.day === day);
        if (!entry) return null;
        const hours = entry.isOpen && entry.slots.length > 0
          ? entry.slots.map(s => `${s.open} – ${s.close}`).join(', ')
          : entry.isOpen ? 'Ouvert' : 'Fermé';
        return { day, label: dayLabels[day] ?? day, isOpen: entry.isOpen, hours };
      })
      .filter(Boolean) as Array<{ day: string; label: string; isOpen: boolean; hours: string }>;
  });

  constructor(private settingsService: SettingsService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Use cached settings if already loaded, otherwise load them
    const cached = this.settingsService.publicSettings();
    if (cached) {
      this.settings.set(cached);
    } else {
      this.settingsService.loadPublicSettings().subscribe(() => {
        this.settings.set(this.settingsService.publicSettings());
      });
    }
  }
}
