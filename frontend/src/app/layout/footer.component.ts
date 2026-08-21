import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SettingsService, PublicSettings } from '../core/services/settings.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="bg-dark-950 text-white">
      <div class="container mx-auto px-4 lg:px-8 py-16">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          <!-- Branding -->
          <div class="space-y-4">
            <h3 class="text-3xl font-display font-bold mb-4">{{ restaurantName() }}</h3>
            <p class="text-dark-400 leading-relaxed">
              Une expérience culinaire méditerranéenne authentique au cœur de Monastir.
            </p>
          </div>

          <!-- Navigation -->
          <div>
            <h4 class="text-lg font-semibold mb-6">Navigation</h4>
            <ul class="space-y-3">
              <li><a routerLink="/" class="text-dark-400 hover:text-primary-500 transition-colors">Accueil</a></li>
              <li><a routerLink="/menu" class="text-dark-400 hover:text-primary-500 transition-colors">Menu</a></li>
              <li>
                <a routerLink="/" fragment="gallery"
                   (click)="onFragmentClick('gallery')"
                   class="text-dark-400 hover:text-primary-500 transition-colors">Galerie</a>
              </li>
              <li>
                <a routerLink="/" fragment="reviews"
                   (click)="onFragmentClick('reviews')"
                   class="text-dark-400 hover:text-primary-500 transition-colors">Avis</a>
              </li>
              <li><a routerLink="/reservation" class="text-dark-400 hover:text-primary-500 transition-colors">Réservation</a></li>
            </ul>
          </div>

          <!-- Contact -->
          <div>
            <h4 class="text-lg font-semibold mb-6">Contact</h4>
            <ul class="space-y-3">
              <!-- Address -->
              @if (addressLine()) {
                <li class="flex items-start space-x-3">
                  <svg class="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="text-dark-400">{{ addressLine() }}</span>
                </li>
              }

              <!-- Phone -->
              @if (phone()) {
                <li class="flex items-center space-x-3">
                  <svg class="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a [href]="telHref()!" class="text-dark-400 hover:text-primary-500 transition-colors">
                    {{ phone() }}
                  </a>
                </li>
              }

              <!-- Opening hours summary -->
              @if (openingHoursSummary()) {
                <li class="flex items-start space-x-3">
                  <svg class="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="text-dark-400 text-sm whitespace-pre-line">{{ openingHoursSummary() }}</div>
                </li>
              }
            </ul>
          </div>

          <!-- Social media -->
          <div>
            <h4 class="text-lg font-semibold mb-6">Suivez-nous</h4>
            <div class="space-y-4">

              <!-- Instagram -->
              @if (instagramUrl()) {
                <a
                  [href]="instagramUrl()!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center space-x-3 text-dark-400 hover:text-primary-500 transition-colors group"
                >
                  <div class="w-10 h-10 bg-dark-900 rounded-lg flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <span>Instagram</span>
                </a>
              }

              <!-- Facebook -->
              @if (facebookUrl()) {
                <a
                  [href]="facebookUrl()!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center space-x-3 text-dark-400 hover:text-primary-500 transition-colors group"
                >
                  <div class="w-10 h-10 bg-dark-900 rounded-lg flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span>Facebook</span>
                </a>
              }

              <!-- TikTok -->
              @if (tiktokUrl()) {
                <a
                  [href]="tiktokUrl()!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center space-x-3 text-dark-400 hover:text-primary-500 transition-colors group"
                >
                  <div class="w-10 h-10 bg-dark-900 rounded-lg flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                    </svg>
                  </div>
                  <span>TikTok</span>
                </a>
              }

            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-dark-900">
        <div class="container mx-auto px-4 lg:px-8 py-6">
          <div class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p class="text-dark-500 text-sm">© {{ currentYear }} {{ restaurantName() }}. Tous droits réservés.</p>
            <div class="flex space-x-6">
              <a routerLink="/confidentialite" class="text-dark-500 hover:text-dark-400 text-sm transition-colors">
                Politique de confidentialité
              </a>
              <a routerLink="/mentions-legales" class="text-dark-500 hover:text-dark-400 text-sm transition-colors">
                Mentions légales
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent implements OnInit {
  private settings = signal<PublicSettings | null>(null);

  readonly currentYear = new Date().getFullYear();

  readonly restaurantName = computed(() =>
    this.settings()?.restaurantName || "BIZZ'ART"
  );

  readonly phone = computed(() => {
    const p = this.settings()?.contact?.phone;
    return p && p.trim() !== '' ? p : null;
  });

  readonly telHref = computed(() => {
    const p = this.phone();
    return p ? `tel:${p.replace(/[\s\-().]/g, '')}` : null;
  });

  readonly addressLine = computed(() => {
    const a = this.settings()?.contact?.address;
    if (!a) return null;
    const parts = [a.street, a.city, a.country].filter(s => s && s.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : null;
  });

  readonly instagramUrl = computed(() => {
    const url = this.settings()?.socialMedia?.instagram;
    return url && url.trim() !== '' ? url : null;
  });

  readonly facebookUrl = computed(() => {
    const url = this.settings()?.socialMedia?.facebook;
    return url && url.trim() !== '' ? url : null;
  });

  readonly tiktokUrl = computed(() => {
    const url = this.settings()?.socialMedia?.tiktok;
    return url && url.trim() !== '' ? url : null;
  });

  readonly openingHoursSummary = computed((): string | null => {
    const oh = this.settings()?.openingHours ?? [];
    if (oh.length === 0) return null;
    const dayLabels: Record<string, string> = {
      monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer',
      thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim',
    };
    const lines = oh
      .filter(h => h.isOpen && h.slots.length > 0)
      .map(h => {
        const hours = h.slots.map(s => `${s.open}–${s.close}`).join(', ');
        return `${dayLabels[h.day] ?? h.day}: ${hours}`;
      });
    return lines.length > 0 ? lines.join('\n') : null;
  });

  constructor(private settingsService: SettingsService, private router: Router) {}

  ngOnInit(): void {
    const cached = this.settingsService.publicSettings();
    if (cached) {
      this.settings.set(cached);
    } else {
      this.settingsService.loadPublicSettings().subscribe(() => {
        this.settings.set(this.settingsService.publicSettings());
      });
    }
  }

  /** Scroll immédiat si déjà sur la homepage, sinon Router navigue et la navbar gère le scroll */
  onFragmentClick(fragment: string): void {
    const currentPath = this.router.url.split('#')[0].split('?')[0];
    if (currentPath === '/' || currentPath === '') {
      const el = document.getElementById(fragment);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
