import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { EXPERIENCES, Experience } from '../home.data';

@Component({
  selector: 'app-experience-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  template: `
    <section class="py-20 lg:py-32 bg-dark-950 text-white">
      <div class="container mx-auto px-4 lg:px-8">
        <div class="max-w-2xl mb-16" appScrollReveal>
          <span class="text-primary-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
            Signature Experience
          </span>
          <h2 class="text-4xl md:text-5xl font-display font-bold mb-6">
            Ce qui rend BIZZ'ART unique
          </h2>
          <p class="text-white/70 text-lg leading-relaxed">
            Une expérience pensée comme un art de vivre, où chaque détail participe à l'émotion du moment.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <article
            *ngFor="let item of experiences; let i = index"
            appScrollReveal
            class="group border border-white/10 p-8 lg:p-10 hover:border-primary-500/40 transition-all duration-500 hover:bg-white/[0.03]"
          >
            <div class="flex items-start gap-6">
              <div
                class="flex-shrink-0 w-14 h-14 border border-primary-500/30 flex items-center justify-center text-primary-400 group-hover:border-primary-500 group-hover:text-primary-300 transition-colors"
              >
                <ng-container [ngSwitch]="item.icon">
                  <svg *ngSwitchCase="'cuisine'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v12m-6-6h12" />
                  </svg>
                  <svg *ngSwitchCase="'art'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <svg *ngSwitchCase="'atmosphere'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <svg *ngSwitchDefault class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </ng-container>
              </div>
              <div>
                <span class="text-primary-500/60 text-xs tracking-widest uppercase mb-2 block">
                  0{{ i + 1 }}
                </span>
                <h3 class="text-2xl font-display font-semibold mb-3 group-hover:text-primary-300 transition-colors">
                  {{ item.title }}
                </h3>
                <p class="text-white/65 leading-relaxed">{{ item.description }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  `,
})
export class ExperienceSectionComponent {
  readonly experiences: Experience[] = EXPERIENCES;
}
