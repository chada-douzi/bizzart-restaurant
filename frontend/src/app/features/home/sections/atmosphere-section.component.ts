import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { ATMOSPHERE_IMAGE } from '../home.data';
import { GalleryService } from '../../../core/services/gallery.service';

@Component({
  selector: 'app-atmosphere-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  template: `
    <section class="relative h-96 lg:h-[600px] overflow-hidden">
      <div class="absolute inset-0 bg-dark-900">
        <img
          [src]="displayImage()"
          [alt]="imageAlt()"
          class="w-full h-full object-cover opacity-60"
          loading="lazy"
          (error)="onImgError($event)"
        />
      </div>
      <div class="relative z-10 h-full flex items-center justify-center text-center px-4" appScrollReveal>
        <div>
          <h2 class="text-4xl md:text-6xl font-display font-bold text-white mb-6">
            Une Ambiance Unique
          </h2>
          <p class="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Plongez dans l'atmosphère chaleureuse et élégante de BIZZ'ART
          </p>
        </div>
      </div>
    </section>
  `,
})
export class AtmosphereSectionComponent implements OnInit {
  private galleryImage = signal<string | null>(null);
  private galleryAlt   = signal<string | null>(null);

  readonly displayImage = computed(() => this.galleryImage() ?? ATMOSPHERE_IMAGE);
  readonly imageAlt     = computed(() => this.galleryAlt() ?? "Ambiance du restaurant BIZZ'ART");

  constructor(private galleryService: GalleryService) {}

  ngOnInit(): void {
    // 3e photo de catégorie 'restaurant' pour varier des sections About et Philosophy
    this.galleryService.getGallery({ category: 'restaurant', type: 'image', limit: 3 }).subscribe({
      next: (res) => {
        const third = res.data?.media?.[2] ?? res.data?.media?.[0];
        if (third) {
          this.galleryImage.set(third.url);
          this.galleryAlt.set(third.altText || third.title || "Ambiance BIZZ'ART");
        }
      },
      error: () => { /* silently fallback */ },
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = ATMOSPHERE_IMAGE;
  }
}
