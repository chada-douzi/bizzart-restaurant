import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { MenuService } from '../../../core/services/menu.service';
import { MenuItem } from '../../../core/models/menu.model';

@Component({
  selector: 'app-signature-dishes-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  template: `
    <section class="py-20 lg:py-32 bg-white overflow-hidden">
      <div class="container mx-auto px-4 lg:px-8">
        <div class="mb-16 lg:mb-24" appScrollReveal>
          <span class="text-primary-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
            Signature Dishes
          </span>
          <h2 class="text-5xl md:text-7xl font-display font-bold text-dark-900 leading-none max-w-4xl">
            Nos créations emblématiques
          </h2>
        </div>

        <!-- Loading -->
        @if (isLoading()) {
          <div class="flex justify-center py-20">
            <svg class="animate-spin w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        }

        <!-- Empty — section hidden when no featured dishes exist -->
        @if (!isLoading() && !featuredDish() && !secondaryDish()) {
          <!-- Intentionally blank: section won't show if no featured items are configured -->
        }

        <!-- Dishes layout -->
        @if (!isLoading() && (featuredDish() || secondaryDish())) {
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">

            <!-- Featured dish -->
            @if (featuredDish(); as dish) {
              <article appScrollReveal class="lg:col-span-7 relative group overflow-hidden">
                <div class="relative h-[480px] lg:h-[720px] overflow-hidden">
                  @if (dish.image) {
                    <img
                      [src]="dish.image"
                      [alt]="dish.name.fr"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                      (error)="onImgError($event)"
                    />
                  } @else {
                    <div class="w-full h-full bg-dark-200 flex items-center justify-center">
                      <svg class="w-16 h-16 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  }
                  <div class="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-dark-950/20 to-transparent"></div>
                  <div class="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
                    <span class="text-primary-300 text-sm tracking-widest uppercase mb-3 block">Plat signature</span>
                    <h3 class="text-4xl lg:text-6xl font-display font-bold text-white mb-4">
                      {{ dish.name.fr }}
                    </h3>
                    @if (dish.description?.fr) {
                      <p class="text-white/80 text-lg max-w-xl mb-4 leading-relaxed">
                        {{ dish.description!.fr }}
                      </p>
                    }
                    <span class="text-3xl font-display text-primary-300">
                      {{ dish.price | number:'1.0-2' }} DT
                    </span>
                  </div>
                </div>
              </article>
            }

            <!-- Secondary dish -->
            @if (secondaryDish(); as dish) {
              <article appScrollReveal class="lg:col-span-5 flex flex-col justify-end">
                <div class="border-l-2 border-primary-600 pl-8 lg:pl-12 py-4">
                  <span class="text-primary-600 text-sm tracking-widest uppercase mb-4 block">À découvrir</span>
                  <div class="relative h-72 lg:h-96 overflow-hidden mb-8 group">
                    @if (dish.image) {
                      <img
                        [src]="dish.image"
                        [alt]="dish.name.fr"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        (error)="onImgError($event)"
                      />
                    } @else {
                      <div class="w-full h-full bg-dark-100 flex items-center justify-center">
                        <svg class="w-12 h-12 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                    }
                  </div>
                  <h3 class="text-3xl lg:text-4xl font-display font-bold text-dark-900 mb-4">
                    {{ dish.name.fr }}
                  </h3>
                  @if (dish.description?.fr) {
                    <p class="text-dark-600 leading-relaxed mb-6">{{ dish.description!.fr }}</p>
                  }
                  <span class="text-2xl font-display text-primary-600">
                    {{ dish.price | number:'1.0-2' }} DT
                  </span>
                </div>
              </article>
            }

          </div>
        }
      </div>
    </section>
  `,
})
export class SignatureDishesSectionComponent implements OnInit {
  isLoading = signal(true);
  featuredDish = signal<MenuItem | null>(null);
  secondaryDish = signal<MenuItem | null>(null);

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.menuService.getFeaturedItems().subscribe({
      next: (response) => {
        const items = response.data?.items ?? [];
        this.featuredDish.set(items[0] ?? null);
        this.secondaryDish.set(items[1] ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
