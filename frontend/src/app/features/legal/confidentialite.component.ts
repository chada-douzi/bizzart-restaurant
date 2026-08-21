import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confidentialite',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-white">
      <!-- Header -->
      <div class="bg-dark-950 py-16 px-4 text-center">
        <p class="text-primary-400 text-xs tracking-widest uppercase mb-3">Données personnelles</p>
        <h1 class="text-3xl md:text-4xl font-display font-bold text-white">Politique de Confidentialité</h1>
      </div>

      <!-- Content -->
      <div class="container mx-auto px-4 lg:px-8 py-16 max-w-3xl">
        <section class="mb-10">
          <h2 class="text-2xl font-display font-semibold text-dark-900 mb-4">Collecte des données</h2>
          <p class="text-dark-600 leading-relaxed">
            Dans le cadre des réservations en ligne, BIZZ'ART collecte les informations suivantes :
            nom, prénom, adresse email et numéro de téléphone. Ces données sont utilisées exclusivement
            pour la gestion de votre réservation.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-2xl font-display font-semibold text-dark-900 mb-4">Utilisation des données</h2>
          <p class="text-dark-600 leading-relaxed">
            Les données collectées ne sont ni vendues, ni transmises à des tiers.
            Elles sont conservées pendant la durée nécessaire à la gestion des réservations.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-2xl font-display font-semibold text-dark-900 mb-4">Vos droits</h2>
          <p class="text-dark-600 leading-relaxed">
            Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès,
            de rectification et de suppression de vos données personnelles.
            Pour exercer ces droits, contactez-nous directement au restaurant.
          </p>
        </section>

        <section class="mb-10">
          <h2 class="text-2xl font-display font-semibold text-dark-900 mb-4">Cookies</h2>
          <p class="text-dark-600 leading-relaxed">
            Ce site utilise des cookies fonctionnels nécessaires au bon fonctionnement de l'application
            (authentification admin). Aucun cookie de tracking ou publicitaire n'est utilisé.
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
export class ConfidentialiteComponent {}
