import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-reservation-cta-section',
  standalone: true,
  imports: [CommonModule, RouterLink, ScrollRevealDirective],
  template: `
    <section
      id="reservation-cta"
      class="py-20 lg:py-32 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 text-white"
    >
      <div class="container mx-auto px-4 lg:px-8 text-center" appScrollReveal>
        <h2 class="text-4xl md:text-6xl font-display font-bold mb-6">Votre Table Vous Attend</h2>
        <p class="text-xl md:text-2xl mb-10 text-white/90 max-w-3xl mx-auto">
          Réservez dès maintenant et vivez une expérience culinaire inoubliable
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <!-- Reserve CTA — always available -->
          <a
            routerLink="/reservation"
            class="px-10 py-5 bg-white text-primary-700 rounded-lg font-bold text-lg hover:bg-primary-50 transition-all shadow-2xl transform hover:scale-105"
          >
            Réserver une Table
          </a>

          <!-- Call CTA — shown only when phone is available in settings -->
          @if (telHref()) {
            <a
              [href]="telHref()!"
              class="px-10 py-5 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-primary-700 transition-all shadow-2xl transform hover:scale-105"
            >
              Nous Appeler
            </a>
          }
        </div>
      </div>
    </section>
  `,
})
export class ReservationCtaSectionComponent implements OnInit {
  private readonly settings = signal<import('../../../core/services/settings.service').PublicSettings | null>(null);

  /** Returns a valid tel: href or null — never exposes placeholder text */
  readonly telHref = computed((): string | null => {
    const phone = this.settings()?.contact?.phone;
    if (!phone || phone.trim() === '') return null;
    return `tel:${phone.replace(/[\s\-().]/g, '')}`;
  });

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    // Use cached settings if available (loaded by APP_INITIALIZER)
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
