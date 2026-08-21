import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { MenuCategory, MenuItem } from '../../core/models/menu.model';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { CategoryWithItems } from '../../core/services/menu.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.6s ease-out;
    }

    .scroll-mt-32 {
      scroll-margin-top: 8rem;
    }

    .tabular-nums {
      font-variant-numeric: tabular-nums;
    }

    /* Smooth scrollbar for category navigation */
    .overflow-x-auto::-webkit-scrollbar {
      height: 4px;
    }

    .overflow-x-auto::-webkit-scrollbar-track {
      background: transparent;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 2px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
  `],
  template: `
    <div class="min-h-screen bg-white">

      <!-- Hero banner -->
      <div class="bg-dark-950 py-20 px-4 text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-b from-primary-900/20 to-transparent"></div>
        <div class="relative z-10 animate-fade-in">
          <p class="text-primary-400 font-sans text-sm tracking-widest uppercase mb-3">{{ restaurantName() }}</p>
          <h1 class="text-4xl md:text-6xl font-display font-bold text-white mb-4">Notre Carte</h1>
          <p class="text-dark-300 text-lg max-w-xl mx-auto">
            {{ menuSubtitle() }}
          </p>
        </div>
      </div>

      <!-- Category navigation (sticky) -->
      @if (!isLoading() && categories().length > 0) {
        <div class="sticky top-16 z-20 bg-white/95 backdrop-blur-sm border-b border-dark-100 shadow-sm">
          <div class="container mx-auto px-4 overflow-x-auto">
            <div class="flex gap-2 py-3 min-w-max">
              @for (cat of categories(); track cat._id) {
                <button
                  (click)="scrollToCategory(cat.slug)"
                  class="relative px-5 py-2.5 text-sm font-medium transition-all whitespace-nowrap rounded-lg"
                  [class]="activeCategory() === cat.slug 
                    ? 'text-primary-600 font-semibold bg-primary-50' 
                    : 'text-dark-600 hover:text-dark-900 hover:bg-dark-50'"
                >
                  {{ cat.name.fr }}
                  @if (activeCategory() === cat.slug) {
                    <span class="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-full"></span>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Content -->
      <div class="container mx-auto px-4 lg:px-8 py-12">

        <!-- Loading -->
        @if (isLoading()) {
          <div class="flex justify-center py-20">
            <svg class="animate-spin w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        }

        <!-- Error -->
        @if (loadError()) {
          <div class="max-w-md mx-auto text-center py-20">
            <p class="text-dark-500 mb-4">{{ loadError() }}</p>
            <button (click)="load()" class="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
              Réessayer
            </button>
          </div>
        }

        <!-- Empty menu -->
        @if (!isLoading() && !loadError() && categories().length === 0) {
          <div class="text-center py-20">
            <p class="text-dark-500 text-lg mb-2">La carte arrive très prochainement.</p>
            <p class="text-dark-400 text-sm">En attendant, n'hésitez pas à nous contacter pour en savoir plus.</p>
            <a routerLink="/reservation" class="inline-block mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors">
              Réserver une table
            </a>
          </div>
        }

        <!-- Categories and items -->
        @if (!isLoading() && !loadError()) {
          <div class="max-w-5xl mx-auto space-y-20">
            @for (cat of categories(); track cat._id) {
              <section [id]="cat.slug" class="scroll-mt-32">
                
                <!-- Category header -->
                <div class="mb-8">
                  <div class="border-b-2 border-primary-100 pb-4 mb-6">
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-dark-900 tracking-tight">
                      {{ cat.name.fr }}
                    </h2>
                    @if (cat.description?.fr) {
                      <p class="text-dark-500 text-base md:text-lg mt-2 italic">
                        {{ cat.description!.fr }}
                      </p>
                    }
                  </div>

                  <!-- Category image (optional) -->
                  @if (getCategoryImageUrl(cat)) {
                    <div class="relative w-full h-[300px] md:h-[400px] lg:h-[500px] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl mb-10 group">
                      <img 
                        [src]="getCategoryImageUrl(cat)!" 
                        [alt]="'Photo représentative - ' + cat.name.fr"
                        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        (error)="onImgError($event)"
                      />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                    </div>
                  }
                </div>

                <!-- Items list -->
                @if (itemsByCategory(cat._id).length === 0) {
                  <p class="text-dark-400 text-sm text-center py-8">Aucun plat disponible dans cette catégorie.</p>
                } @else {
                  <!-- Special handling for Supplement category (grouped by tags) -->
                  @if (cat.slug === 'supplement') {
                    @for (tagGroup of Array.from(groupItemsByTag(itemsByCategory(cat._id)).entries()); track tagGroup[0]) {
                      <div class="mb-12">
                        <!-- Sub-section header -->
                        <h3 class="text-2xl md:text-3xl font-display font-semibold text-dark-800 mb-6 border-l-4 border-primary-500 pl-4">
                          {{ tagGroup[0] }}
                        </h3>
                        
                        <div class="space-y-6">
                          @for (item of tagGroup[1]; track item._id; let isLast = $last) {
                            <article class="group">
                              <!-- Desktop layout -->
                              <div class="hidden md:flex items-baseline gap-3 mb-1.5">
                                <h4 class="text-lg font-display font-medium text-dark-900 group-hover:text-primary-600 transition-colors flex-shrink-0">
                                  {{ item.name.fr }}
                                </h4>
                                <div class="flex-grow border-b border-dotted border-dark-200 mb-1.5 opacity-40"></div>
                                <span class="text-lg font-bold text-primary-600 flex-shrink-0 tabular-nums">
                                  {{ item.price | number:'1.2-2' }} DT
                                </span>
                              </div>

                              <!-- Mobile layout -->
                              <div class="flex md:hidden justify-between items-start gap-3 mb-2">
                                <h4 class="text-base font-display font-medium text-dark-900 flex-1">
                                  {{ item.name.fr }}
                                </h4>
                                <span class="text-base font-bold text-primary-600 tabular-nums whitespace-nowrap">
                                  {{ item.price | number:'1.2-2' }} DT
                                </span>
                              </div>

                              <!-- Description (for variable prices) -->
                              @if (item.description?.fr) {
                                <p class="text-dark-500 text-xs md:text-sm italic mb-2">
                                  {{ item.description!.fr }}
                                </p>
                              }

                              <!-- Separator -->
                              @if (!isLast) {
                                <div class="border-b border-dark-50 mt-4"></div>
                              }
                            </article>
                          }
                        </div>
                      </div>
                    }
                  } @else {
                    <!-- Normal category display -->
                    <div class="space-y-6">
                      @for (item of itemsByCategory(cat._id); track item._id; let isLast = $last) {
                        <article class="group">
                        
                        <!-- Desktop layout (md+): name ... price on same line -->
                        <div class="hidden md:flex items-baseline gap-3 mb-1.5">
                          <h3 class="text-xl font-display font-semibold text-dark-900 group-hover:text-primary-600 transition-colors flex-shrink-0">
                            {{ item.name.fr }}
                            @if (item.isFeatured) {
                              <span class="text-primary-500 ml-2 text-lg">★</span>
                            }
                          </h3>
                          
                          <div class="flex-grow border-b border-dotted border-dark-200 mb-1.5 opacity-40"></div>
                          
                          <span class="text-xl font-bold text-primary-600 flex-shrink-0 tabular-nums">
                            {{ item.price | number:'1.2-2' }} DT
                          </span>
                        </div>

                        <!-- Mobile layout (<md): name and price stacked -->
                        <div class="flex md:hidden justify-between items-start gap-3 mb-2">
                          <h3 class="text-lg font-display font-semibold text-dark-900 flex-1">
                            {{ item.name.fr }}
                            @if (item.isFeatured) {
                              <span class="text-primary-500 text-sm ml-1">★</span>
                            }
                          </h3>
                          <span class="text-lg font-bold text-primary-600 tabular-nums whitespace-nowrap">
                            {{ item.price | number:'1.2-2' }} DT
                          </span>
                        </div>

                        <!-- Description -->
                        @if (item.description?.fr) {
                          <p class="text-dark-600 text-sm md:text-base leading-relaxed mb-3 max-w-3xl">
                            {{ item.description!.fr }}
                          </p>
                        }

                        <!-- Tags and allergens -->
                        @if ((item.tags && item.tags.length > 0) || (item.allergens && item.allergens.length > 0)) {
                          <div class="flex flex-wrap gap-2 items-center">
                            @if (item.tags && item.tags.length > 0) {
                              @for (tag of item.tags; track tag) {
                                <span class="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">
                                  {{ tag }}
                                </span>
                              }
                            }
                            @if (item.allergens && item.allergens.length > 0) {
                              <span class="text-xs text-dark-500 italic flex items-center gap-1">
                                <svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                                </svg>
                                {{ item.allergens.join(', ') }}
                              </span>
                            }
                          </div>
                        }

                        <!-- Separator (not on last item) -->
                        @if (!isLast) {
                          <div class="border-b border-dark-50 mt-6"></div>
                        }
                      </article>
                    }
                  </div>
                  }
                }
              </section>
            }
          </div>
        }

        <!-- CTA -->
        @if (!isLoading() && categories().length > 0) {
          <div class="text-center mt-24 py-12 border-t border-dark-100">
            <p class="text-dark-600 text-lg mb-5">Une question sur notre carte ? Envie de réserver ?</p>
            <a routerLink="/reservation"
              class="inline-block px-8 py-3.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Réserver une Table
            </a>
          </div>
        }
      </div>
    </div>
  `,
})
export class MenuComponent implements OnInit {
  categories = signal<MenuCategory[]>([]);
  allItems = signal<MenuItem[]>([]);
  activeCategory = signal('');
  isLoading = signal(true);
  loadError = signal('');

  // Expose Array for template
  Array = Array;

  // Dynamic values from SettingsService (loaded by APP_INITIALIZER before render)
  readonly restaurantName = computed(() =>
    this.settingsService.publicSettings()?.restaurantName ?? "BIZZ'ART Monastir"
  );

  readonly menuSubtitle = computed(() => {
    const desc = this.settingsService.publicSettings()?.description?.fr;
    return (desc && desc.trim() !== '')
      ? desc
      : 'Cuisine méditerranéenne authentique, revisitée avec passion';
  });

  constructor(
    private menuService: MenuService,
    private seoService: SeoService,
    private settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    const s = this.settingsService.publicSettings();
    const title    = s?.seo?.metaTitle?.fr     || "Notre Carte — BIZZ'ART Monastir";
    const desc     = s?.seo?.metaDescription?.fr
      || "Découvrez la carte de BIZZ'ART Monastir : entrées, plats, desserts et boissons de notre restaurant méditerranéen.";
    const keywords = s?.seo?.keywords?.join(', ') || 'menu restaurant, carte, plats, BIZZ\'ART Monastir';
    this.seoService.updateSeo({ title, description: desc, keywords });
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    // Load all active categories
    this.menuService.getCategories().subscribe({
      next: (catRes) => {
        if (!catRes.success || !catRes.data?.length) {
          this.isLoading.set(false);
          return;
        }
        const cats = catRes.data;
        this.categories.set(cats);
        if (cats.length > 0) this.activeCategory.set(cats[0].slug);

        // Load all available items — limit 200 (API max) to handle large menus without pagination
        this.menuService.getItems({ limit: 200 }).subscribe({
          next: (itemRes) => {
            if (itemRes.success && itemRes.data) {
              this.allItems.set(itemRes.data.items);
            }
            this.isLoading.set(false);
          },
          error: () => { this.loadError.set('Impossible de charger les plats.'); this.isLoading.set(false); },
        });
      },
      error: () => { this.loadError.set('Impossible de charger le menu.'); this.isLoading.set(false); },
    });
  }

  itemsByCategory(categoryId: string): MenuItem[] {
    return this.allItems().filter(item => {
      const catId = typeof item.category === 'string' ? item.category : (item.category as MenuCategory)._id;
      return catId === categoryId;
    }).sort((a, b) => a.order - b.order);
  }

  scrollToCategory(slug: string): void {
    this.activeCategory.set(slug);
    const el = document.getElementById(slug);
    if (el) {
      const offset = 120; // Account for sticky header
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Check if category image URL is valid (Cloudinary URL).
   * Returns null for invalid local paths to prevent 404 errors.
   */
  getCategoryImageUrl(cat: MenuCategory): string | null {
    if (!cat.image) return null;
    
    // Only accept full Cloudinary URLs
    if (cat.image.startsWith('https://res.cloudinary.com/') || 
        cat.image.startsWith('http://res.cloudinary.com/')) {
      return cat.image;
    }
    
    // Reject local/relative paths
    if (cat.image.startsWith('/') || cat.image.startsWith('./') || cat.image.startsWith('../')) {
      return null;
    }
    
    // Reject invalid default.jpg patterns
    if (cat.image.includes('-default.jpg')) {
      return null;
    }
    
    // If absolute URL from another domain, allow it
    if (cat.image.startsWith('http://') || cat.image.startsWith('https://')) {
      return cat.image;
    }
    
    return null;
  }

  /**
   * Group items by their first tag (for supplements: Pizza vs Sandwich)
   */
  groupItemsByTag(items: MenuItem[]): Map<string, MenuItem[]> {
    const groups = new Map<string, MenuItem[]>();
    
    items.forEach(item => {
      const tag = item.tags && item.tags.length > 0 ? item.tags[0] : 'Autres';
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag)!.push(item);
    });
    
    return groups;
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
