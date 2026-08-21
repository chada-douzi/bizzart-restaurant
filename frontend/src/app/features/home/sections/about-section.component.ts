import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { ABOUT_IMAGE } from '../home.data';
import { GalleryService } from '../../../core/services/gallery.service';

@Component({
  selector: 'app-about-section',
  standalone: true,
  imports: [CommonModule, RouterLink, ScrollRevealDirective],
  template: `
    <section id="about" class="py-20 lg:py-32 bg-white overflow-hidden">
      <div class="container mx-auto px-4 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div class="lg:col-span-5 order-2 lg:order-1" appScrollReveal>
            <span class="text-primary-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
              Notre histoire
            </span>
            <h2 class="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-dark-900 mb-6 leading-tight">
              L'expérience BIZZ'ART
            </h2>
            <div class="w-16 h-0.5 bg-primary-600 mb-8"></div>
            <p class="text-xl text-dark-700 leading-relaxed mb-6">
              Au cœur de Monastir, BIZZ'ART vous invite à découvrir une cuisine méditerranéenne authentique
              où la tradition italienne rencontre les saveurs de la mer.
            </p>
            <p class="text-lg text-dark-600 leading-relaxed mb-10">
              Chaque plat est préparé avec passion, des ingrédients frais et un savoir-faire qui transforme
              votre repas en une véritable expérience culinaire et artistique.
            </p>
            <a
              routerLink="/menu"
              class="inline-flex items-center gap-3 text-dark-900 font-semibold border-b-2 border-primary-600 pb-1 hover:text-primary-700 transition-colors group"
            >
              Découvrir notre menu
              <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          <div class="lg:col-span-7 order-1 lg:order-2" appScrollReveal>
            <div class="relative">
              <div class="absolute -top-6 -left-6 w-full h-full border border-primary-200 rounded-sm hidden lg:block"></div>
              <img
                [src]="displayImage()"
                [alt]="imageAlt()"
                class="relative w-full h-[420px] lg:h-[560px] object-cover rounded-sm shadow-2xl"
                loading="lazy"
                (error)="onImgError($event)"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AboutSectionComponent implements OnInit {
  private galleryImage = signal<string | null>(null);
  private galleryAlt   = signal<string | null>(null);

  readonly displayImage = computed(() => this.galleryImage() ?? ABOUT_IMAGE);
  readonly imageAlt     = computed(() => this.galleryAlt() ?? "Ambiance et salle du restaurant BIZZ'ART");

  constructor(private galleryService: GalleryService) {}

  ngOnInit(): void {
    // Utilise la première photo de catégorie 'restaurant' si disponible
    this.galleryService.getGallery({ category: 'restaurant', type: 'image', limit: 1 }).subscribe({
      next: (res) => {
        const first = res.data?.media?.[0];
        if (first) {
          this.galleryImage.set(first.url);
          this.galleryAlt.set(first.altText || first.title || "Restaurant BIZZ'ART");
        }
      },
      error: () => { /* silently fallback to ABOUT_IMAGE */ },
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = ABOUT_IMAGE;
  }
}
