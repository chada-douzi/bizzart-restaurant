import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { PHILOSOPHY_IMAGE } from '../home.data';
import { GalleryService } from '../../../core/services/gallery.service';

@Component({
  selector: 'app-philosophy-section',
  standalone: true,
  imports: [CommonModule, RouterLink, ScrollRevealDirective],
  template: `
    <section class="py-20 lg:py-32 bg-accent-cream overflow-hidden">
      <div class="container mx-auto px-4 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div class="lg:col-span-6 order-2 lg:order-1" appScrollReveal>
            <span class="text-primary-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
              Notre philosophie
            </span>
            <h2 class="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-dark-900 mb-8 leading-tight">
              Une cuisine pensée comme un art
            </h2>
            <p class="text-xl text-dark-700 leading-relaxed mb-6">
              Chez BIZZ'ART, chaque assiette est le fruit d'une vision exigeante : respecter le produit,
              sublimer la saison, et créer une émotion sincère autour de la table.
            </p>
            <p class="text-lg text-dark-600 leading-relaxed mb-8">
              Notre équipe compose une cuisine méditerranéenne où technique, créativité et générosité
              se rencontrent dans un esprit résolument contemporain.
            </p>
            <a
              routerLink="/"
              fragment="about"
              class="inline-flex items-center gap-2 text-primary-700 font-semibold hover:text-primary-800 transition-colors"
            >
              En savoir plus sur BIZZ'ART
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          <div class="lg:col-span-6 order-1 lg:order-2" appScrollReveal>
            <img
              [src]="displayImage()"
              [alt]="imageAlt()"
              class="w-full h-[400px] lg:h-[520px] object-cover rounded-sm shadow-xl"
              loading="lazy"
              (error)="onImgError($event)"
            />
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PhilosophySectionComponent implements OnInit {
  private galleryImage = signal<string | null>(null);
  private galleryAlt   = signal<string | null>(null);

  readonly displayImage = computed(() => this.galleryImage() ?? PHILOSOPHY_IMAGE);
  readonly imageAlt     = computed(() => this.galleryAlt() ?? 'Philosophie culinaire BIZZ\'ART');

  constructor(private galleryService: GalleryService) {}

  ngOnInit(): void {
    // 2e photo de catégorie 'restaurant' ou 1re photo 'team' pour varier
    this.galleryService.getGallery({ category: 'restaurant', type: 'image', limit: 2 }).subscribe({
      next: (res) => {
        const second = res.data?.media?.[1] ?? res.data?.media?.[0];
        if (second) {
          this.galleryImage.set(second.url);
          this.galleryAlt.set(second.altText || second.title || 'Cuisine BIZZ\'ART');
        }
      },
      error: () => { /* silently fallback */ },
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = PHILOSOPHY_IMAGE;
  }
}
