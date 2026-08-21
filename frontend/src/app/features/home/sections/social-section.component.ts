import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-social-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  template: `
    <section class="py-20 lg:py-32 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 text-white">
      <div class="container mx-auto px-4 lg:px-8 text-center" appScrollReveal>
        <h2 class="text-4xl md:text-5xl font-display font-bold mb-6">Suivez l'Expérience BIZZ'ART</h2>
        <div class="w-24 h-1 bg-primary-600 mx-auto mb-8"></div>
        <p class="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
          Rejoignez notre communauté et découvrez nos dernières créations culinaires
        </p>

        <div class="flex flex-col sm:flex-row gap-6 justify-center items-center">

          <!-- Instagram — shown only when URL is available in settings -->
          @if (instagramUrl()) {
            <a
              [href]="instagramUrl()!"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl transform hover:scale-105"
              aria-label="Suivez BIZZ'ART sur Instagram"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span>Suivez-nous sur Instagram</span>
            </a>
          }

          <!-- Facebook — shown only when URL is available in settings -->
          @if (facebookUrl()) {
            <a
              [href]="facebookUrl()!"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center space-x-3 px-8 py-4 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-2xl transform hover:scale-105"
              aria-label="Suivez BIZZ'ART sur Facebook"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Suivez-nous sur Facebook</span>
            </a>
          }

          <!-- TikTok — shown only when URL is available in settings -->
          @if (tiktokUrl()) {
            <a
              [href]="tiktokUrl()!"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center space-x-3 px-8 py-4 bg-dark-800 border border-dark-600 rounded-lg font-semibold hover:bg-dark-700 transition-all shadow-2xl transform hover:scale-105"
              aria-label="Suivez BIZZ'ART sur TikTok"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
              </svg>
              <span>Suivez-nous sur TikTok</span>
            </a>
          }

          <!-- Empty state: no social links configured yet -->
          @if (!instagramUrl() && !facebookUrl() && !tiktokUrl()) {
            <p class="text-white/50 text-sm">Réseaux sociaux à venir</p>
          }

        </div>
      </div>
    </section>
  `,
})
export class SocialSectionComponent implements OnInit {
  private readonly settings = signal<import('../../../core/services/settings.service').PublicSettings | null>(null);

  readonly instagramUrl = computed((): string | null => {
    const url = this.settings()?.socialMedia?.instagram;
    return url && url.trim() !== '' ? url : null;
  });

  readonly facebookUrl = computed((): string | null => {
    const url = this.settings()?.socialMedia?.facebook;
    return url && url.trim() !== '' ? url : null;
  });

  readonly tiktokUrl = computed((): string | null => {
    const url = this.settings()?.socialMedia?.tiktok;
    return url && url.trim() !== '' ? url : null;
  });

  constructor(private settingsService: SettingsService) {}

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
}
