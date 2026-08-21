import {
  Component, OnInit, OnDestroy, computed, signal,
  HostListener, ViewChild, ElementRef, AfterViewInit, PLATFORM_ID, Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { GalleryService } from '../../../core/services/gallery.service';
import { Media, MediaCategory } from '../../../core/models/media.model';

type GalleryFilter = 'all' | MediaCategory;

interface FilterOption {
  id: GalleryFilter;
  label: string;
}

const FILTERS: FilterOption[] = [
  { id: 'all',        label: 'Tout' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'food',       label: 'Cuisine' },
  { id: 'events',     label: 'Événements' },
  { id: 'gallery',    label: 'Galerie' },
  { id: 'team',       label: 'Équipe' },
];

@Component({
  selector: 'app-gallery-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  template: `
    <!-- Section masquée entièrement si galerie vide après chargement -->
    @if (isLoading() || allMedia().length > 0) {
      <section id="gallery" class="py-20 lg:py-32 bg-white">
        <div class="container mx-auto px-4 lg:px-8">

          <!-- Header -->
          <div class="text-center mb-12" appScrollReveal>
            <span class="text-primary-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
              Galerie
            </span>
            <h2 class="text-4xl md:text-5xl font-display font-bold text-dark-900 mb-6">
              L'univers BIZZ'ART
            </h2>
            <div class="w-24 h-1 bg-primary-600 mx-auto mb-6"></div>
            <p class="text-lg text-dark-600 max-w-2xl mx-auto">
              Restaurant, cuisine, événements et ambiance — un aperçu visuel de l'expérience.
            </p>
          </div>

          <!-- Loading skeleton -->
          @if (isLoading()) {
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              @for (s of skeletons; track s) {
                <div class="h-48 bg-dark-100 rounded-xl animate-pulse"></div>
              }
            </div>
          }

          @if (!isLoading() && allMedia().length > 0) {

            <!-- Filters -->
            <div class="flex flex-wrap justify-center gap-3 mb-12" role="tablist" appScrollReveal>
              @for (filter of activeFilters(); track filter.id) {
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="activeFilter() === filter.id"
                  (click)="setFilter(filter.id)"
                  (keydown)="onFilterKeydown($event, filter.id)"
                  class="px-5 py-2 text-sm font-medium rounded-full border transition-all duration-300
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  [class.bg-dark-900]="activeFilter() === filter.id"
                  [class.text-white]="activeFilter() === filter.id"
                  [class.border-dark-900]="activeFilter() === filter.id"
                  [class.bg-white]="activeFilter() !== filter.id"
                  [class.text-dark-700]="activeFilter() !== filter.id"
                  [class.border-dark-200]="activeFilter() !== filter.id"
                >
                  {{ filter.label }}
                </button>
              }
            </div>

            <!-- Grid —
                 La première cellule (i=0) prend col-span-2 + row-span-2.
                 grid-rows est défini explicitement pour que les 2 lignes aient
                 la même hauteur, et les cellules de droite remplissent h-full
                 pour coller parfaitement sans espace blanc. -->
            <div
              class="grid grid-cols-2 md:grid-cols-3 grid-rows-2 gap-1 transition-opacity duration-300"
              style="grid-auto-rows: 1fr;"
              [class.opacity-40]="isTransitioning()"
            >
              @for (item of filteredMedia(); track item._id; let i = $index) {
                <div
                  class="relative overflow-hidden rounded-none group cursor-pointer focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-primary-600"
                  [class.md:col-span-2]="i === 0 && filteredMedia().length > 2"
                  [class.md:row-span-2]="i === 0 && filteredMedia().length > 2"
                  [style.min-height]="(i === 0 && filteredMedia().length > 2) ? '' : ''"
                  appScrollReveal
                  (click)="openLightbox(i)"
                  (keydown.enter)="openLightbox(i); $event.preventDefault()"
                  (keydown.space)="openLightbox(i); $event.preventDefault()"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Agrandir : ' + (item.altText || item.title || 'photo')"
                >
                  <!-- Image ou vignette vidéo -->
                  @if (item.type === 'video' && item.thumbnailUrl) {
                    <img
                      [src]="item.thumbnailUrl"
                      [alt]="item.altText || item.title || 'Vidéo'"
                      class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      (error)="onImgError($event)"
                    />
                  } @else {
                    <img
                      [src]="item.url"
                      [alt]="item.altText || item.title || ''"
                      class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      (error)="onImgError($event)"
                    />
                  }

                  <!-- Badge vidéo -->
                  @if (item.type === 'video') {
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div class="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <svg class="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  }

                  <!-- Overlay hover -->
                  <div class="absolute inset-0 bg-gradient-to-t from-dark-900/70 via-dark-900/10 to-transparent
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none">
                    @if (item.title) {
                      <p class="text-white text-sm font-medium line-clamp-1">{{ item.title }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          }

        </div>
      </section>
    }

    <!-- ── Lightbox ── -->
    @if (lightboxIndex() !== null && currentLightboxItem()) {
      <div
        #lightboxOverlay
        class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="currentLightboxItem()?.title || 'Galerie en plein écran'"
        (click)="closeLightbox()"
      >
        <!-- Bouton Fermer — reçoit le focus à l'ouverture -->
        <button
          #closeBtn
          class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-20 p-2
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg"
          (click)="closeLightbox()"
          aria-label="Fermer la galerie"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <!-- Prev -->
        @if (filteredMedia().length > 1) {
          <button
            class="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white
                   transition-colors z-20 p-3 focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-white rounded-lg"
            (click)="$event.stopPropagation(); prevLightbox()"
            aria-label="Image précédente"
          >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        }

        <!-- Contenu -->
        <div
          class="max-w-5xl w-full max-h-[90vh] px-14 md:px-20 flex flex-col items-center gap-4"
          (click)="$event.stopPropagation()"
        >
          @if (currentLightboxItem()!.type === 'video') {
            <video
              class="max-w-full max-h-[78vh] rounded-xl shadow-2xl"
              controls
              autoplay
              muted
              loop
              [src]="currentLightboxItem()!.url"
            ></video>
          } @else {
            <img
              class="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl"
              [src]="currentLightboxItem()!.url"
              [alt]="currentLightboxItem()!.altText || currentLightboxItem()!.title || ''"
            />
          }

          <!-- Légende + compteur -->
          <div class="text-center space-y-1">
            @if (currentLightboxItem()?.title) {
              <p class="text-white/80 text-sm">{{ currentLightboxItem()!.title }}</p>
            }
            <p class="text-white/40 text-xs">
              {{ (lightboxIndex() ?? 0) + 1 }} / {{ filteredMedia().length }}
            </p>
          </div>
        </div>

        <!-- Next -->
        @if (filteredMedia().length > 1) {
          <button
            class="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white
                   transition-colors z-20 p-3 focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-white rounded-lg"
            (click)="$event.stopPropagation(); nextLightbox()"
            aria-label="Image suivante"
          >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        }
      </div>
    }
  `,
})
export class GallerySectionComponent implements OnInit, OnDestroy {

  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;

  readonly filters   = FILTERS;
  readonly skeletons = [1, 2, 3, 4, 5, 6]; // skeleton placeholders during loading

  allMedia        = signal<Media[]>([]);
  isLoading       = signal(true);
  activeFilter    = signal<GalleryFilter>('all');
  isTransitioning = signal(false);
  lightboxIndex   = signal<number | null>(null);

  private _prevFocus: HTMLElement | null = null;

  activeFilters = computed<FilterOption[]>(() => {
    const cats = new Set(this.allMedia().map(m => m.category));
    return FILTERS.filter(f => f.id === 'all' || cats.has(f.id as MediaCategory));
  });

  filteredMedia = computed<Media[]>(() => {
    const f = this.activeFilter();
    return f === 'all' ? this.allMedia() : this.allMedia().filter(m => m.category === f);
  });

  currentLightboxItem = computed<Media | null>(() => {
    const idx = this.lightboxIndex();
    return idx !== null ? (this.filteredMedia()[idx] ?? null) : null;
  });

  constructor(
    private galleryService: GalleryService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    this.galleryService.getGallery({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.data?.media) this.allMedia.set(res.data.media);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  ngOnDestroy(): void {
    // Restore scroll if component destroyed while lightbox is open
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = '';
  }

  // ── Escape global via HostListener (captures focus wherever it is) ──────────
  @HostListener('document:keydown', ['$event'])
  onDocKeydown(e: KeyboardEvent): void {
    if (this.lightboxIndex() === null) return;
    if (e.key === 'Escape')      { this.closeLightbox(); return; }
    if (e.key === 'ArrowLeft')   { this.prevLightbox(); return; }
    if (e.key === 'ArrowRight')  { this.nextLightbox(); return; }
    // Basic focus trap: Tab stays inside lightbox overlay
    if (e.key === 'Tab') {
      const overlay = document.querySelector('[role="dialog"]') as HTMLElement | null;
      if (!overlay) return;
      const focusable = Array.from(
        overlay.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }

  setFilter(filter: GalleryFilter): void {
    if (this.activeFilter() === filter) return;
    this.isTransitioning.set(true);
    this.activeFilter.set(filter);
    setTimeout(() => this.isTransitioning.set(false), 200);
  }

  openLightbox(index: number): void {
    this._prevFocus = document.activeElement as HTMLElement | null;
    this.lightboxIndex.set(index);
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = 'hidden';
    // Focus le bouton Fermer après le rendu
    setTimeout(() => this.closeBtn?.nativeElement?.focus(), 50);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(null);
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = '';
    // Rendre le focus à l'élément qui avait le focus avant l'ouverture
    setTimeout(() => this._prevFocus?.focus(), 50);
  }

  prevLightbox(): void {
    const idx = this.lightboxIndex();
    if (idx === null) return;
    const len = this.filteredMedia().length;
    this.lightboxIndex.set((idx - 1 + len) % len);
  }

  nextLightbox(): void {
    const idx = this.lightboxIndex();
    if (idx === null) return;
    this.lightboxIndex.set((idx + 1) % this.filteredMedia().length);
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onFilterKeydown(event: KeyboardEvent, _filter: GalleryFilter): void {
    const buttons = Array.from(
      (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('[role="tab"]') ?? []
    ) as HTMLButtonElement[];
    const idx = buttons.indexOf(event.currentTarget as HTMLButtonElement);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = event.key === 'ArrowRight'
        ? (idx + 1) % buttons.length
        : (idx - 1 + buttons.length) % buttons.length;
      buttons[next]?.focus();
      buttons[next]?.click();
    }
  }
}
