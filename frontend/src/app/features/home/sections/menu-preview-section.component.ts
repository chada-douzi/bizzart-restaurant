import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';

@Component({
  selector: 'app-menu-preview-section',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective],
  template: `
    <section class="py-20 lg:py-32 bg-accent-cream">
      <div class="container mx-auto px-4 lg:px-8">
        <div class="max-w-4xl mx-auto text-center" appScrollReveal>
          <!-- Label -->
          <span class="text-primary-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
            MENU
          </span>

          <!-- Titre Principal -->
          <h2 class="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-dark-900 mb-6 leading-tight">
            Découvrez notre carte
          </h2>

          <!-- Divider -->
          <div class="w-24 h-1 bg-primary-600 mx-auto mb-8"></div>

          <!-- Description -->
          <p class="text-lg md:text-xl text-dark-600 leading-relaxed max-w-3xl mx-auto mb-12">
            Une sélection gourmande inspirée de la cuisine italienne et des saveurs de la mer, 
            préparée avec soin pour vous offrir une expérience authentique chez BIZZ'ART.
          </p>

          <!-- CTA Button -->
          <a
            routerLink="/menu"
            class="inline-block px-12 py-5 bg-dark-900 text-white text-lg font-semibold rounded-lg 
                   hover:bg-dark-800 active:bg-dark-950 
                   transition-all duration-300 
                   shadow-lg hover:shadow-xl 
                   transform hover:scale-105 active:scale-100
                   focus:outline-none focus:ring-4 focus:ring-primary-300 focus:ring-opacity-50"
          >
            Découvrir le menu complet
          </a>
        </div>
      </div>
    </section>
  `,
})
export class MenuPreviewSectionComponent {
  // Plus de logique API nécessaire - Section statique premium CTA
}
