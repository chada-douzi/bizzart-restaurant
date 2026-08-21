import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div class="text-center max-w-lg">
        <!-- Numéro 404 stylisé -->
        <p class="text-[8rem] md:text-[12rem] font-display font-bold leading-none
                   text-transparent bg-clip-text bg-gradient-to-b from-primary-500/60 to-primary-900/20
                   select-none">
          404
        </p>

        <h1 class="text-2xl md:text-3xl font-display font-bold text-white mb-4 -mt-4">
          Page introuvable
        </h1>
        <p class="text-dark-400 text-lg mb-10 leading-relaxed">
          Cette page n'existe pas ou a été déplacée.<br/>
          Retournez à l'accueil pour continuer votre navigation.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            routerLink="/"
            class="px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl
                   hover:bg-primary-700 transition-colors"
          >
            Retour à l'accueil
          </a>
          <a
            routerLink="/reservation"
            class="px-8 py-3 border border-dark-600 text-dark-300 font-semibold rounded-xl
                   hover:border-primary-500 hover:text-white transition-colors"
          >
            Réserver une table
          </a>
        </div>

        <p class="mt-12 text-dark-600 text-sm">
          BIZZ'ART Monastir — Restaurant Italien & Fruits de Mer
        </p>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
