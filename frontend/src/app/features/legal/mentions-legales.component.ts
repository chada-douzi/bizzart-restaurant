import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-white">
      <!-- Header -->
      <div class="bg-dark-950 py-16 px-4 text-center">
        <p class="text-primary-400 text-xs tracking-widest uppercase mb-3">Informations légales</p>
        <h1 class="text-3xl md:text-4xl font-display font-bold text-white">Mentions Légales</h1>
      </div>

      <!-- Content -->
      <div class="container mx-auto px-4 lg:px-8 py-16 max-w-3xl prose prose-dark">
        <section class="mb-10">
          <h2 class="text-2xl font-display font-semibold text-dark-900 mb-4">Éditeur du site</h2>
          <p class="text-dark-600 leading-relaxed">
            Le site <strong>bizzart-monastir.com</strong> est édité par le restaurant BIZZ'ART,
            établissement situé à Monastir, Tunisie.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-2xl font-display font-semibold text-dark-900 mb-4">Propriété intellectuelle</h2>
          <p class="text-dark-600 leading-relaxed">
            L'ensemble du contenu de ce site (textes, images, vidéos, logo, marque) est la propriété
            exclusive de BIZZ'ART. Toute reproduction ou utilisation sans autorisation préalable est interdite.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-2xl font-display font-semibold text-dark-900 mb-4">Responsabilité</h2>
          <p class="text-dark-600 leading-relaxed">
            BIZZ'ART s'efforce de maintenir les informations de ce site à jour et exactes.
            Toutefois, aucune garantie n'est donnée quant à l'exactitude ou l'exhaustivité des informations publiées.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-2xl font-display font-semibold text-dark-900 mb-4">Contact</h2>
          <p class="text-dark-600 leading-relaxed">
            Pour toute question relative au présent site, vous pouvez nous contacter via le formulaire
            de réservation ou directement au restaurant.
          </p>
        </section>

        <div class="pt-8 border-t border-dark-100">
          <a routerLink="/" class="text-primary-600 hover:text-primary-700 text-sm transition-colors">
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  `,
})
export class MentionsLegalesComponent {}
