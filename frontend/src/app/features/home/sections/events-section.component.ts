import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { EVENTS, EventItem } from '../home.data';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-events-section',
  standalone: true,
  imports: [CommonModule, RouterLink, ScrollRevealDirective],
  template: `
    <section id="events" class="py-20 lg:py-32 bg-white">
      <div class="container mx-auto px-4 lg:px-8">
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16" appScrollReveal>
          <div>
            <span class="text-primary-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
              Événements
            </span>
            <h2 class="text-4xl md:text-5xl font-display font-bold text-dark-900">
              Moments à vivre
            </h2>
          </div>
          <p class="text-dark-600 max-w-md leading-relaxed">
            Des rendez-vous pensés pour enrichir l'expérience BIZZ'ART, entre gastronomie, art et convivialité.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          @for (event of displayEvents(); track event.id ?? event.title) {
            <article
              appScrollReveal
              class="group border border-dark-100 p-8 hover:border-primary-300 hover:shadow-lg transition-all duration-300"
            >
              <!-- Image si disponible -->
              @if (event.imageUrl) {
                <img
                  [src]="event.imageUrl"
                  [alt]="event.title"
                  class="w-full h-40 object-cover rounded-lg mb-6"
                  loading="lazy"
                  (error)="onImgError($event)"
                />
              }

              <time class="text-primary-600 text-sm font-semibold tracking-wider uppercase mb-4 block">
                {{ event.date }}
                @if (event.time) {
                  <span class="ml-2 font-normal normal-case text-dark-400">{{ event.time }}</span>
                }
              </time>
              <h3 class="text-2xl font-display font-semibold text-dark-900 mb-3 group-hover:text-primary-700 transition-colors">
                {{ event.title }}
              </h3>
              <p class="text-dark-600 leading-relaxed mb-6">{{ event.description }}</p>
              <a
                routerLink="/reservation"
                class="inline-flex items-center gap-2 text-sm font-semibold text-dark-900 border-b border-primary-600 pb-0.5 hover:text-primary-700 transition-colors"
              >
                En savoir plus
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class EventsSectionComponent implements OnInit {
  /** Events from Settings API — falls back to static home.data.ts if empty */
  private apiEvents = signal<EventItem[] | null>(null);

  readonly displayEvents = computed<EventItem[]>(() => {
    const api = this.apiEvents();
    if (api !== null && api.length > 0) return api;
    return EVENTS; // fallback to static data
  });

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    const settings = this.settingsService.publicSettings();
    const rawEvents = settings?.events;
    if (rawEvents && rawEvents.length > 0) {
      this.apiEvents.set(rawEvents.map((e, i) => ({
        id: String(i),
        title:       e.title,
        description: e.description ?? '',
        date:        e.date ?? 'À venir',
        time:        e.time,
        imageUrl:    e.imageUrl,
      })));
    }
    // If settings were not yet loaded, listen for changes
    if (!settings) {
      this.settingsService.loadPublicSettings().subscribe(() => {
        const loaded = this.settingsService.publicSettings();
        const loadedEvents = loaded?.events;
        if (loadedEvents && loadedEvents.length > 0) {
          this.apiEvents.set(loadedEvents.map((e, i) => ({
            id: String(i),
            title:       e.title,
            description: e.description ?? '',
            date:        e.date ?? 'À venir',
            time:        e.time,
            imageUrl:    e.imageUrl,
          })));
        }
      });
    }
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
