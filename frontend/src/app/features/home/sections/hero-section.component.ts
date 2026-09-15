import {
  Component,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * BIZZ'ART HERO — True Full-Bleed Design
 * 
 * Photo: hero-restaurant-facade.jpg (994×726px, ratio 1.369)
 * Architecture: Photo 100% surface + overlay léger + contenu par-dessus
 * Hero height: Adapté au ratio photo (~73vh) pour minimiser crop
 * 
 * Direction: Méditerranéen nocturne premium, photo claire, texte lisible
 */
@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Hero Full-Bleed: Photo covers 100% of surface -->
    <section 
      class="hero-fullbleed relative w-full overflow-hidden"
      [style.height]="heroHeight"
    >
      
      <!-- Photo Background: Absolute full-bleed covering entire Hero -->
      <div class="absolute inset-0 w-full h-full">
        <img
          src="/images/hero/hero-restaurant-facade.jpg"
          alt="Restaurant BIZZ'ART Monastir — Façade illuminée de nuit au bord de la mer"
          class="w-full h-full object-cover"
          [style.object-position]="imagePosition"
          loading="eager"
          fetchpriority="high"
        />
      </div>

      <!-- Subtle Overlay: Text readability left, photo visible right -->
      <div 
        class="absolute inset-0 pointer-events-none"
        style="background: linear-gradient(
          to right,
          rgba(11, 18, 32, 0.75) 0%,
          rgba(11, 18, 32, 0.55) 25%,
          rgba(11, 18, 32, 0.30) 50%,
          rgba(11, 18, 32, 0.12) 70%,
          transparent 100%
        );"
      ></div>

      <!-- Subtle grain for cinematic feel -->
      <div class="absolute inset-0 opacity-[0.012] mix-blend-overlay pointer-events-none bg-noise"></div>

      <!-- Content Over Photo -->
      <div class="relative z-10 h-full flex items-center">
        <div class="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          
          <div class="max-w-2xl">
            
            <!-- Editorial Title: Over photo -->
            <h1 class="font-serif font-bold leading-[0.88] mb-10 lg:mb-14 animate-fade-in-up">
              <span 
                class="block text-hero-light mb-3"
                style="font-size: clamp(2.5rem, 6vw, 4.5rem); 
                       letter-spacing: -0.02em;
                       text-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3);"
              >
                Le goût.
              </span>
              <span 
                class="block text-hero-accent mb-3"
                style="font-size: clamp(2.5rem, 6vw, 4.5rem); 
                       letter-spacing: -0.02em;
                       text-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3);"
              >
                La mer.
              </span>
              <span 
                class="block text-hero-light"
                style="font-size: clamp(2.5rem, 6vw, 4.5rem); 
                       letter-spacing: -0.02em;
                       text-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3);"
              >
                L'instant.
              </span>
            </h1>

            <!-- CTAs: 3 actions strictement alignées sur une ligne (desktop/tablet) -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-start gap-4 animate-fade-in-up animation-delay-200">
              
              <!-- PRIMARY CTA: Réserver une table -->
              <a
                routerLink="/reservation"
                class="inline-flex items-center justify-center px-8 py-3.5 
                       bg-cta-primary text-cta-primary-text font-semibold text-base
                       transition-all duration-300 ease-out
                       hover:bg-cta-primary-hover hover:shadow-2xl hover:shadow-cta-primary/60 hover:scale-[1.02]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
                       shadow-xl"
                style="border-radius: 4px;"
                aria-label="Réserver une table au restaurant BIZZ'ART"
              >
                Réserver une table
              </a>

              <!-- SECONDARY CTA: Appeler maintenant -->
              <a
                href="tel:+21653065000"
                class="inline-flex items-center justify-center gap-2 px-8 py-3.5 
                       bg-white/10 backdrop-blur-sm text-hero-light font-semibold text-base
                       border border-white/30
                       transition-all duration-300 ease-out
                       hover:bg-white/20 hover:border-white/50 hover:shadow-xl
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                style="border-radius: 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);"
                aria-label="Appeler le restaurant BIZZ'ART au +216 53 065 000"
              >
                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                <span>Appeler maintenant</span>
              </a>

              <!-- SECONDARY CTA: Découvrir le menu -->
              <a
                routerLink="/menu"
                class="inline-flex items-center justify-center gap-2 px-8 py-3.5 
                       bg-white/10 backdrop-blur-sm text-hero-light font-semibold text-base
                       border border-white/30
                       transition-all duration-300 ease-out
                       hover:bg-white/20 hover:border-white/50 hover:shadow-xl
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                style="border-radius: 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);"
                aria-label="Découvrir le menu du restaurant BIZZ'ART"
              >
                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span>Découvrir le menu</span>
              </a>

            </div>

          </div>

        </div>
      </div>

    </section>
  `,
  styles: [`
    /* ══════════════════════════════════════════════════════════════════ */
    /* HERO FULL-BLEED — VOTRE PHOTO 100% SURFACE */
    /* ══════════════════════════════════════════════════════════════════ */

    .hero-fullbleed {
      position: relative;
      width: 100%;
      background-color: #0B1220; /* Fallback */
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* COLOR TOKENS */
    /* ══════════════════════════════════════════════════════════════════ */
    
    :host {
      --hero-light: #F3EFE6;
      --hero-accent: #C89B6B;
      --cta-primary: #C89B6B;
      --cta-primary-hover: #A97F52;
      --cta-primary-text: #0B1220;
    }

    .text-hero-light { color: var(--hero-light); }
    .text-hero-accent { color: var(--hero-accent); }
    .bg-cta-primary { background-color: var(--cta-primary); }
    .bg-cta-primary-hover { background-color: var(--cta-primary-hover); }
    .text-cta-primary-text { color: var(--cta-primary-text); }
    .text-cta-primary { color: var(--cta-primary); }
    .shadow-cta-primary\\/60 { --tw-shadow-color: rgba(200, 155, 107, 0.6); }
    .ring-cta-primary { --tw-ring-color: var(--cta-primary); }
    .border-cta-primary { border-color: var(--cta-primary); }
    .hover\\:border-cta-primary:hover { border-color: var(--cta-primary); }

    /* ══════════════════════════════════════════════════════════════════ */
    /* GRAIN TEXTURE */
    /* ══════════════════════════════════════════════════════════════════ */
    
    .bg-noise {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* ANIMATIONS */
    /* ══════════════════════════════════════════════════════════════════ */
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in-up {
      animation: fadeInUp 1s ease-out forwards;
    }

    .animation-delay-200 {
      animation-delay: 0.2s;
      opacity: 0;
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* REDUCED MOTION */
    /* ══════════════════════════════════════════════════════════════════ */
    
    @media (prefers-reduced-motion: reduce) {
      .animate-fade-in-up {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
    }
  `],
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  isBrowser = false;
  reducedMotion = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  /**
   * Hero height adapté au ratio de la photo (1.369)
   * Desktop: 73vh → réduit crop de ~23% à ~10%
   * Mobile: 100vh → plein écran
   */
  get heroHeight(): string {
    if (!this.isBrowser) {
      return 'min(73vh, 850px)';
    }
    const isMobile = window.innerWidth < 768;
    return isMobile ? '100vh' : 'min(73vh, 850px)';
  }

  /**
   * Position de l'image adaptée au viewport
   * Desktop: center center
   * Mobile: center 40% (remonte légèrement la façade)
   */
  get imagePosition(): string {
    if (!this.isBrowser) {
      return 'center center';
    }
    const isMobile = window.innerWidth < 768;
    return isMobile ? 'center 40%' : 'center center';
  }

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.reducedMotion = this.isBrowser
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  }

  ngOnDestroy(): void {}
}
