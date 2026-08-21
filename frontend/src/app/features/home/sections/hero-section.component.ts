import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * BIZZ'ART CINEMATIC HERO — Gastronomic Film Experience
 * 
 * Art Direction:
 * - 6 distinct hero images creating a visual narrative
 * - 5-act story structure (MYSTÈRE → REVEAL → IDENTITÉ → SIGNATURE → INVITATION)
 * - Each act has distinct composition, focal point, lighting
 * - Feels like 5 separate advertising shots, not photo + zoom
 * - CTAs visible from Act 1, elegant integration
 * 
 * Images:
 * - Act 1: hero-paella-noire.png (macro grill, noir/doré, MYSTÈRE)
 * - Act 2: hero-crevettes-poisson.png (crevette spectaculaire, REVEAL)
 * - Act 3: hero-paella-fruits-mer.png → hero-grillade.png (IDENTITÉ Méditerranée + contexte)
 * - Act 4: hero-crevettes-poisson.png (NOUVELLE COMPOSITION radicale, SIGNATURE)
 * - Act 5: hero-tagliatelles-burrata.png (chaleur, INVITATION)
 * 
 * Technical:
 * - 500vh scroll container with 100vh sticky viewport
 * - GPU-accelerated transforms (translate3d, scale)
 * - requestAnimationFrame scroll handling
 * - prefers-reduced-motion fallback
 * - Mobile-optimized composition
 */
@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Cinematic Scroll Container: 500vh -->
    <section 
      class="hero-scroll-container relative w-full"
      [style.height]="containerHeight()"
    >
      
      <!-- Sticky Cinematic Viewport: 100vh -->
      <div class="hero-viewport sticky top-0 left-0 w-full h-screen overflow-hidden bg-dark-950">
        
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- LAYER 01: ATMOSPHERE (Deepest) -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div 
          class="hero-layer absolute inset-0 will-change-transform"
          [style.transform]="layerTransform().atmosphere"
          [style.opacity]="layerOpacity().atmosphere"
        >
          <!-- Deep dark base -->
          <div class="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-950 to-black"></div>
          
          <!-- Subtle warm ambient glow -->
          <div 
            class="absolute inset-0 opacity-20"
            style="background: radial-gradient(ellipse 80% 60% at 65% 45%, rgba(212, 175, 55, 0.15) 0%, rgba(139, 149, 86, 0.08) 30%, transparent 70%);"
          ></div>
          
          <!-- Texture grain overlay (very subtle) -->
          <div class="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-noise"></div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- LAYER 02: ENVIRONMENT (Contextual depth) -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div 
          class="hero-layer absolute inset-0 will-change-transform"
          [style.transform]="layerTransform().environment"
          [style.opacity]="layerOpacity().environment"
        >
          <!-- Soft depth gradient -->
          <div 
            class="absolute inset-0"
            style="background: radial-gradient(ellipse 70% 50% at 60% 50%, transparent 0%, rgba(26, 26, 26, 0.3) 40%, rgba(26, 26, 26, 0.6) 80%);"
          ></div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- LAYER 03: HERO IMAGES (Main Subject — 6 distinct compositions) -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        
        <!-- ACT 1 IMAGE: hero-paella-noire.png (MYSTÈRE) -->
        <div 
          class="hero-layer absolute inset-0 will-change-transform transition-opacity duration-1000"
          [style.opacity]="imageOpacity(1)"
          [style.transform]="imageTransform(1)"
        >
          <img
            [src]="heroImages.act1"
            alt="Grillades noires et dorées BIZZ'ART — mystère gastronomique"
            class="absolute inset-0 w-full h-full object-cover"
            [style.object-position]="imagePosition(1)"
            [style.filter]="imageFilter(1)"
            loading="eager"
            fetchpriority="high"
          />
        </div>

        <!-- ACT 2 IMAGE: hero-crevettes-poisson.png (REVEAL) -->
        <div 
          class="hero-layer absolute inset-0 will-change-transform transition-opacity duration-1000"
          [style.opacity]="imageOpacity(2)"
          [style.transform]="imageTransform(2)"
        >
          <img
            [src]="heroImages.act2"
            alt="Crevette spectaculaire BIZZ'ART — reveal culinaire"
            class="absolute inset-0 w-full h-full object-cover"
            [style.object-position]="imagePosition(2)"
            [style.filter]="imageFilter(2)"
            loading="eager"
          />
        </div>

        <!-- ACT 3a IMAGE: hero-paella-fruits-mer.png (IDENTITÉ Méditerranée) -->
        <div 
          class="hero-layer absolute inset-0 will-change-transform transition-opacity duration-1000"
          [style.opacity]="imageOpacity(3)"
          [style.transform]="imageTransform(3)"
        >
          <img
            [src]="heroImages.act3a"
            alt="Paella fruits de mer BIZZ'ART — identité méditerranéenne"
            class="absolute inset-0 w-full h-full object-cover"
            [style.object-position]="imagePosition(3)"
            [style.filter]="imageFilter(3)"
            loading="eager"
          />
        </div>

        <!-- ACT 3b IMAGE: hero-grillade.png (IDENTITÉ contexte restaurant) -->
        <div 
          class="hero-layer absolute inset-0 will-change-transform transition-opacity duration-1000"
          [style.opacity]="imageOpacity(3.5)"
          [style.transform]="imageTransform(3.5)"
        >
          <img
            [src]="heroImages.act3b"
            alt="Expérience restaurant BIZZ'ART — contexte chaleureux"
            class="absolute inset-0 w-full h-full object-cover"
            [style.object-position]="imagePosition(3.5)"
            [style.filter]="imageFilter(3.5)"
            loading="eager"
          />
        </div>

        <!-- ACT 4 IMAGE: hero-crevettes-poisson.png (SIGNATURE — NOUVELLE COMPOSITION) -->
        <div 
          class="hero-layer absolute inset-0 will-change-transform transition-opacity duration-1000"
          [style.opacity]="imageOpacity(4)"
          [style.transform]="imageTransform(4)"
        >
          <img
            [src]="heroImages.act4"
            alt="Signature culinaire BIZZ'ART — composition éditoriale"
            class="absolute inset-0 w-full h-full object-cover"
            [style.object-position]="imagePosition(4)"
            [style.filter]="imageFilter(4)"
            loading="eager"
          />
        </div>

        <!-- ACT 5 IMAGE: hero-tagliatelles-burrata.png (INVITATION) -->
        <div 
          class="hero-layer absolute inset-0 will-change-transform transition-opacity duration-1000"
          [style.opacity]="imageOpacity(5)"
          [style.transform]="imageTransform(5)"
        >
          <img
            [src]="heroImages.act5"
            alt="Tagliatelles burrata BIZZ'ART — invitation gourmande"
            class="absolute inset-0 w-full h-full object-cover"
            [style.object-position]="imagePosition(5)"
            [style.filter]="imageFilter(5)"
            loading="eager"
          />
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- LAYER 04: LIGHTING (Cinematic illumination) -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="hero-layer absolute inset-0 pointer-events-none">
          
          <!-- Dynamic vignette -->
          <div 
            class="absolute inset-0 transition-opacity duration-1000"
            [style.opacity]="lightingOpacity().vignette"
            [style.background]="vignetteGradient()"
          ></div>
          
          <!-- Warm cinematic glow (intensifies in Act 4) -->
          <div 
            class="absolute inset-0 mix-blend-overlay transition-opacity duration-1000"
            [style.opacity]="lightingOpacity().warmGlow"
            style="background: radial-gradient(ellipse 60% 50% at 58% 42%, rgba(212, 175, 55, 0.35) 0%, rgba(212, 175, 55, 0.15) 30%, transparent 60%);"
          ></div>

          <!-- Directional light sweep (Act 2-3) -->
          <div 
            class="absolute inset-0 mix-blend-screen transition-opacity duration-1000"
            [style.opacity]="lightingOpacity().lightSweep"
            [style.background]="lightSweepGradient()"
          ></div>

          <!-- Text readability gradient (left side) -->
          <div 
            class="absolute inset-0 transition-opacity duration-700"
            [style.opacity]="lightingOpacity().textGradient"
            style="background: linear-gradient(to right, rgba(26, 26, 26, 0.95) 0%, rgba(26, 26, 26, 0.80) 20%, rgba(26, 26, 26, 0.50) 40%, rgba(26, 26, 26, 0.20) 55%, transparent 70%);"
          ></div>

          <!-- Bottom fade (for scroll indicator) -->
          <div 
            class="absolute inset-0"
            style="background: linear-gradient(to bottom, transparent 75%, rgba(26, 26, 26, 0.6) 100%);"
          ></div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- LAYER 05: TYPOGRAPHY & CONTENT (Narrative layer) -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="hero-layer relative z-20 h-full flex flex-col">
          
          <!-- Cinematic UI Elements (top) -->
          <div class="absolute top-6 left-6 sm:top-8 sm:left-8 lg:top-10 lg:left-12 text-white/30 text-[10px] sm:text-xs font-mono tracking-wider pointer-events-none">
            <div class="flex items-center gap-4">
              <span>BIZZ'ART</span>
              <span class="text-white/20">•</span>
              <span>SCENE {{ sceneNumber() }}</span>
              <span class="text-white/20">•</span>
              <span>{{ timecode() }}</span>
            </div>
          </div>

          <!-- Scroll progress indicator (top right) -->
          <div class="absolute top-6 right-6 sm:top-8 sm:right-8 lg:top-10 lg:right-12 pointer-events-none">
            <div class="flex items-center gap-2 text-white/30 text-[10px] sm:text-xs font-mono">
              <span>{{ Math.round(scrollProgress() * 100) }}%</span>
              <div class="w-16 h-[2px] bg-white/10">
                <div 
                  class="h-full bg-primary-400 transition-all duration-300"
                  [style.width.%]="scrollProgress() * 100"
                ></div>
              </div>
            </div>
          </div>

          <!-- Main content area -->
          <div class="flex-1 flex items-center py-20 sm:py-24">
            <div class="container mx-auto px-6 sm:px-8 lg:px-16 max-w-7xl w-full">
              
              <!-- ═══ ACT 1: ARRIVAL (0-18%) ═══ -->
              @if (currentAct() === 1) {
                <div 
                  class="max-w-2xl text-center md:text-left mx-auto md:mx-0 hero-content-act"
                  [style.opacity]="actOpacity(1)"
                  [style.transform]="actTransform(1)"
                >
                  <!-- Eyebrow -->
                  <p class="text-primary-400 text-[10px] sm:text-xs md:text-sm font-semibold tracking-[0.35em] uppercase mb-6 sm:mb-8">
                    BIZZ'ART MONASTIR
                  </p>

                  <!-- Editorial Title -->
                  <h1 class="font-serif font-bold leading-[0.95] mb-2">
                    <span class="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-white">Le goût.</span>
                  </h1>
                  <h1 class="font-serif font-bold leading-[0.95] mb-2">
                    <span class="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-primary-300">La mer.</span>
                  </h1>
                  <h1 class="font-serif font-bold leading-[0.95] mb-10 sm:mb-12">
                    <span class="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-white">L'instant.</span>
                  </h1>

                  <!-- CTAs (Always visible in Act 1) -->
                  <div class="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pointer-events-auto">
                    <a
                      routerLink="/reservation"
                      class="group relative px-8 py-4 bg-primary-600 text-white font-semibold text-base sm:text-lg
                             overflow-hidden transition-all duration-300
                             hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950
                             text-center shadow-2xl hover:shadow-primary-600/60"
                      style="border-radius: 2px;"
                      aria-label="Réserver une table au restaurant BIZZ'ART"
                    >
                      <span class="relative z-10">Réserver une table</span>
                      <div class="absolute inset-0 bg-primary-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                    </a>
                    <a
                      routerLink="/menu"
                      class="group px-8 py-4 bg-white/5 backdrop-blur-sm text-white font-semibold text-base sm:text-lg
                             border border-white/25 hover:bg-white/10 hover:border-white/40
                             transition-all duration-300
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950
                             text-center shadow-xl"
                      style="border-radius: 2px;"
                      aria-label="Découvrir le menu du restaurant BIZZ'ART"
                    >
                      Découvrir le menu
                    </a>
                  </div>
                </div>
              }

              <!-- ═══ ACT 2: REVEAL (18-40%) ═══ -->
              @if (currentAct() === 2) {
                <div 
                  class="max-w-2xl text-center md:text-left mx-auto md:mx-0 hero-content-act"
                  [style.opacity]="actOpacity(2)"
                  [style.transform]="actTransform(2)"
                >
                  <h2 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-[1.1] mb-6 sm:mb-8">
                    L'art du goût.<br>
                    <span class="text-primary-300">La passion de recevoir.</span>
                  </h2>
                  <p class="text-lg sm:text-xl md:text-2xl text-white/90 font-light leading-relaxed max-w-xl mx-auto md:mx-0">
                    Des produits frais, des créations généreuses et une atmosphère pensée pour partager.
                  </p>
                </div>
              }

              <!-- ═══ ACT 3: EXPERIENCE (40-62%) ═══ -->
              @if (currentAct() === 3) {
                <div 
                  class="max-w-3xl text-center md:text-left mx-auto md:mx-0 space-y-12 sm:space-y-16 hero-content-act"
                  [style.opacity]="actOpacity(3)"
                  [style.transform]="actTransform(3)"
                >
                  <!-- Pillar 1 -->
                  <div 
                    class="transition-all duration-700"
                    [style.opacity]="pillarOpacity(1)"
                    [style.transform]="'translateY(' + ((1 - pillarOpacity(1)) * 30) + 'px)'"
                  >
                    <h3 class="text-xs sm:text-sm font-bold text-primary-400 mb-3 tracking-[0.3em] uppercase">
                      LE GOÛT
                    </h3>
                    <p class="text-xl sm:text-2xl md:text-3xl text-white/90 font-light leading-relaxed">
                      Des créations généreuses préparées avec passion.
                    </p>
                  </div>

                  <!-- Pillar 2 -->
                  <div 
                    class="transition-all duration-700"
                    [style.opacity]="pillarOpacity(2)"
                    [style.transform]="'translateY(' + ((1 - pillarOpacity(2)) * 30) + 'px)'"
                  >
                    <h3 class="text-xs sm:text-sm font-bold text-primary-400 mb-3 tracking-[0.3em] uppercase">
                      LA MER
                    </h3>
                    <p class="text-xl sm:text-2xl md:text-3xl text-white/90 font-light leading-relaxed">
                      La fraîcheur au cœur de l'expérience.
                    </p>
                  </div>

                  <!-- Pillar 3 -->
                  <div 
                    class="transition-all duration-700"
                    [style.opacity]="pillarOpacity(3)"
                    [style.transform]="'translateY(' + ((1 - pillarOpacity(3)) * 30) + 'px)'"
                  >
                    <h3 class="text-xs sm:text-sm font-bold text-primary-400 mb-3 tracking-[0.3em] uppercase">
                      MONASTIR
                    </h3>
                    <p class="text-xl sm:text-2xl md:text-3xl text-white/90 font-light leading-relaxed">
                      Une adresse unique au bord de la Méditerranée.
                    </p>
                  </div>
                </div>
              }

              <!-- ═══ ACT 4: SIGNATURE (62-82%) ═══ -->
              @if (currentAct() === 4) {
                <div 
                  class="max-w-2xl text-center md:text-left mx-auto md:mx-0 hero-content-act"
                  [style.opacity]="actOpacity(4)"
                  [style.transform]="actTransform(4)"
                >
                  <p class="text-xs sm:text-sm font-bold text-primary-400 mb-6 tracking-[0.3em] uppercase">
                    BIZZ'ART • SIGNATURE EXPERIENCE
                  </p>
                  <h2 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-tight mb-8">
                    Une expérience<br>à savourer.
                  </h2>
                </div>
              }

              <!-- ═══ ACT 5: FINAL (82-100%) ═══ -->
              @if (currentAct() === 5) {
                <div 
                  class="max-w-2xl text-center md:text-left mx-auto md:mx-0 hero-content-act"
                  [style.opacity]="actOpacity(5)"
                  [style.transform]="actTransform(5)"
                >
                  <p class="text-primary-400 text-[10px] sm:text-xs md:text-sm font-semibold tracking-[0.35em] uppercase mb-6">
                    BIZZ'ART MONASTIR
                  </p>
                  <h2 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-4">
                    L'art du goût.<br>
                    <span class="text-primary-300">La passion de recevoir.</span>
                  </h2>
                  
                  <!-- Final CTAs -->
                  <div class="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mt-10 pointer-events-auto">
                    <a
                      routerLink="/reservation"
                      class="group relative px-8 py-4 bg-primary-600 text-white font-semibold text-base sm:text-lg
                             overflow-hidden transition-all duration-300
                             hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950
                             text-center shadow-2xl hover:shadow-primary-600/60"
                      style="border-radius: 2px;"
                      aria-label="Réserver une table au restaurant BIZZ'ART"
                    >
                      <span class="relative z-10">Réserver une table</span>
                      <div class="absolute inset-0 bg-primary-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                    </a>
                    <a
                      routerLink="/menu"
                      class="group px-8 py-4 bg-white/5 backdrop-blur-sm text-white font-semibold text-base sm:text-lg
                             border border-white/25 hover:bg-white/10 hover:border-white/40
                             transition-all duration-300
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950
                             text-center shadow-xl"
                      style="border-radius: 2px;"
                      aria-label="Découvrir le menu du restaurant BIZZ'ART"
                    >
                      Découvrir le menu
                    </a>
                  </div>
                </div>
              }

            </div>
          </div>

          <!-- Scroll indicator (bottom, visible in Act 1 only) -->
          @if (scrollProgress() < 0.12) {
            <div 
              class="pb-8 sm:pb-10 flex justify-center transition-opacity duration-500"
              [style.opacity]="Math.max(1 - (scrollProgress() * 8), 0)"
            >
              <div class="text-center text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                <span class="block text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-2 font-semibold">Scroll to explore</span>
                <svg
                  class="w-5 h-5 sm:w-6 sm:h-6 mx-auto"
                  [class.animate-bounce]="!reducedMotion"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          }

        </div>

      </div>
    </section>
  `,
  styles: [`
    /* ══════════════════════════════════════════════════════════════════ */
    /* CINEMATIC HERO STYLES */
    /* ══════════════════════════════════════════════════════════════════ */

    .hero-scroll-container {
      /* Dynamic height: 500vh desktop, 350vh mobile */
    }

    .hero-viewport {
      /* Sticky positioning creates cinematic scroll-control */
    }

    .hero-layer {
      /* GPU acceleration for 60fps */
      backface-visibility: hidden;
      -webkit-font-smoothing: antialiased;
    }

    .hero-content-act {
      /* Smooth content transitions */
      transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Noise texture (very subtle grain) */
    .bg-noise {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    /* CTA hover effects */
    a[routerLink] {
      position: relative;
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* REDUCED MOTION SUPPORT */
    /* ══════════════════════════════════════════════════════════════════ */
    @media (prefers-reduced-motion: reduce) {
      .hero-scroll-container {
        height: 100vh !important;
      }

      .hero-layer {
        transform: none !important;
        transition: none !important;
      }

      .hero-content-act {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }

      .animate-bounce {
        animation: none !important;
      }
    }

    /* ══════════════════════════════════════════════════════════════════ */
    /* MOBILE OPTIMIZATIONS */
    /* ══════════════════════════════════════════════════════════════════ */
    @media (max-width: 767px) {
      .hero-scroll-container {
        height: 350vh;
      }
    }
  `],
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  // ═══ PLATFORM & STATE ════════════════════════════════════════════════
  isBrowser = false;
  reducedMotion = false;
  private rafId?: number;
  private scrollListenerBound = this.onScroll.bind(this);

  // ═══ SIGNALS ═════════════════════════════════════════════════════════
  scrollProgress = signal(0); // 0 to 1
  currentAct = signal(1); // 1-5

  // ═══ ASSETS ══════════════════════════════════════════════════════════
  readonly heroImages = {
    act1: '/images/hero/hero-paella-noire.png',          // MYSTÈRE: macro grill, noir/doré
    act2: '/images/hero/hero-crevettes-poisson.png',     // REVEAL: crevette spectaculaire
    act3a: '/images/hero/hero-paella-fruits-mer.png',    // IDENTITÉ: Méditerranée
    act3b: '/images/hero/hero-grillade.png',             // IDENTITÉ: contexte restaurant
    act4: '/images/hero/hero-crevettes-poisson.png',     // SIGNATURE: nouvelle composition radicale
    act5: '/images/hero/hero-tagliatelles-burrata.png',  // INVITATION: chaleur
  } as const;

  // ═══ UTILITY ═════════════════════════════════════════════════════════
  readonly Math = Math;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  // ═══ LIFECYCLE ═══════════════════════════════════════════════════════

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.reducedMotion = this.isBrowser
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    if (this.isBrowser && !this.reducedMotion) {
      window.addEventListener('scroll', this.scrollListenerBound, { passive: true });
      this.onScroll(); // Initial calc
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.scrollListenerBound);
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
    }
  }

  // ═══ SCROLL HANDLING ═════════════════════════════════════════════════

  private onScroll(): void {
    if (this.rafId) return;

    this.rafId = requestAnimationFrame(() => {
      this.updateScrollProgress();
      this.rafId = undefined;
    });
  }

  private updateScrollProgress(): void {
    const scrollTop = window.scrollY;
    const isMobile = window.innerWidth < 768;
    const heroHeight = window.innerHeight * (isMobile ? 3.5 : 5); // 350vh mobile, 500vh desktop
    const progress = Math.min(Math.max(scrollTop / heroHeight, 0), 1);
    
    // DEBUG: Log scroll progress
    if (Math.random() < 0.1) { // Log 10% of the time to avoid spam
      console.log('[HERO DEBUG]', {
        scrollTop,
        heroHeight,
        progress: (progress * 100).toFixed(1) + '%',
        currentAct: this.currentAct(),
        windowHeight: window.innerHeight,
        imageOpacities: {
          act1: this.imageOpacity(1).toFixed(2),
          act2: this.imageOpacity(2).toFixed(2),
          act3: this.imageOpacity(3).toFixed(2),
          act3_5: this.imageOpacity(3.5).toFixed(2),
          act4: this.imageOpacity(4).toFixed(2),
          act5: this.imageOpacity(5).toFixed(2),
        }
      });
    }
    
    this.scrollProgress.set(progress);
    this.updateCurrentAct(progress);
  }

  private updateCurrentAct(p: number): void {
    if (p < 0.18) this.currentAct.set(1);       // Act 1: Arrival
    else if (p < 0.40) this.currentAct.set(2);  // Act 2: Reveal
    else if (p < 0.62) this.currentAct.set(3);  // Act 3: Experience
    else if (p < 0.82) this.currentAct.set(4);  // Act 4: Signature
    else this.currentAct.set(5);                // Act 5: Final
  }

  // ═══ RESPONSIVE HEIGHT ═══════════════════════════════════════════════

  containerHeight(): string {
    if (!this.isBrowser || this.reducedMotion) return '100vh';
    return typeof window !== 'undefined' && window.innerWidth < 768 ? '350vh' : '500vh';
  }

  // ═══ LAYER TRANSFORMS (Atmosphere & Environment only) ═══════════════

  layerTransform() {
    const p = this.scrollProgress();
    
    // LAYER 01: ATMOSPHERE (slowest, creates depth)
    const atmScale = 1 + (p * 0.08);
    const atmY = -(p * 5);
    const atmRotate = p * 0.5;
    
    // LAYER 02: ENVIRONMENT (medium speed)
    const envScale = 1 + (p * 0.12);
    const envX = -(p * 3);
    const envY = -(p * 6);
    
    return {
      atmosphere: `translate3d(0, ${atmY}%, 0) scale(${atmScale}) rotate(${atmRotate}deg)`,
      environment: `translate3d(${envX}%, ${envY}%, 0) scale(${envScale})`,
    };
  }

  layerOpacity() {
    const p = this.scrollProgress();
    return {
      atmosphere: Math.min(0.4 + (p * 0.4), 0.8),
      environment: Math.min(0.2 + (p * 0.5), 0.7),
    };
  }

  // ═══ IMAGE MANAGEMENT (6 distinct compositions) ═════════════════════

  imageOpacity(actNumber: number): number {
    const p = this.scrollProgress();
    
    // Act 1: 0-18%
    if (actNumber === 1) {
      if (p < 0.18) return 1;
      if (p < 0.22) return 1 - ((p - 0.18) / 0.04) * 1; // Fade out
      return 0;
    }
    
    // Act 2: 18-40%
    if (actNumber === 2) {
      if (p < 0.16) return 0;
      if (p < 0.20) return ((p - 0.16) / 0.04) * 1; // Fade in
      if (p < 0.40) return 1;
      if (p < 0.44) return 1 - ((p - 0.40) / 0.04) * 1; // Fade out
      return 0;
    }
    
    // Act 3a (paella fruits mer): 40-51%
    if (actNumber === 3) {
      if (p < 0.38) return 0;
      if (p < 0.42) return ((p - 0.38) / 0.04) * 1; // Fade in
      if (p < 0.51) return 1;
      if (p < 0.55) return 1 - ((p - 0.51) / 0.04) * 1; // Fade out
      return 0;
    }
    
    // Act 3b (grillade): 51-62%
    if (actNumber === 3.5) {
      if (p < 0.49) return 0;
      if (p < 0.53) return ((p - 0.49) / 0.04) * 1; // Fade in
      if (p < 0.62) return 1;
      if (p < 0.66) return 1 - ((p - 0.62) / 0.04) * 1; // Fade out
      return 0;
    }
    
    // Act 4: 62-82%
    if (actNumber === 4) {
      if (p < 0.60) return 0;
      if (p < 0.64) return ((p - 0.60) / 0.04) * 1; // Fade in
      if (p < 0.82) return 1;
      if (p < 0.86) return 1 - ((p - 0.82) / 0.04) * 1; // Fade out
      return 0;
    }
    
    // Act 5: 82-100%
    if (actNumber === 5) {
      if (p < 0.80) return 0;
      if (p < 0.84) return ((p - 0.80) / 0.04) * 1; // Fade in
      return 1;
    }
    
    return 0;
  }

  imageTransform(actNumber: number): string {
    const p = this.scrollProgress();
    
    // Subtle scale evolution for each image to create depth
    // Each image gets its own scale curve
    
    if (actNumber === 1) {
      // Act 1: Start very zoomed, slight pull back
      const scale = 1.8 - ((p / 0.18) * 0.2);
      return `scale(${scale})`;
    }
    
    if (actNumber === 2) {
      // Act 2: Medium zoom, dynamic reveal
      const localP = Math.max(0, Math.min((p - 0.18) / 0.22, 1));
      const scale = 1.4 - (localP * 0.15);
      return `scale(${scale})`;
    }
    
    if (actNumber === 3) {
      // Act 3a: Classic presentation
      const localP = Math.max(0, Math.min((p - 0.40) / 0.11, 1));
      const scale = 1.15 - (localP * 0.05);
      return `scale(${scale})`;
    }
    
    if (actNumber === 3.5) {
      // Act 3b: Contextual wide shot
      const localP = Math.max(0, Math.min((p - 0.51) / 0.11, 1));
      const scale = 1.1 - (localP * 0.05);
      return `scale(${scale})`;
    }
    
    if (actNumber === 4) {
      // Act 4: RADICAL COMPOSITION — large scale with dramatic positioning
      const localP = Math.max(0, Math.min((p - 0.62) / 0.20, 1));
      const scale = 1.6 - (localP * 0.1);
      return `scale(${scale})`;
    }
    
    if (actNumber === 5) {
      // Act 5: Gentle, inviting composition
      const localP = Math.max(0, Math.min((p - 0.82) / 0.18, 1));
      const scale = 1.15 - (localP * 0.05);
      return `scale(${scale})`;
    }
    
    return 'scale(1)';
  }

  imagePosition(actNumber: number): string {
    // Each act has a distinct object-position for unique composition
    
    if (actNumber === 1) {
      // Act 1: MYSTÈRE — macro dark grill, focus bottom-left textures
      return '35% 65%';
    }
    
    if (actNumber === 2) {
      // Act 2: REVEAL — vertical crevette spectaculaire, center focus
      return '50% 45%';
    }
    
    if (actNumber === 3) {
      // Act 3a: IDENTITÉ — paella safran, centered jewel
      return '50% 50%';
    }
    
    if (actNumber === 3.5) {
      // Act 3b: IDENTITÉ — contexte restaurant, wider composition
      return '55% 48%';
    }
    
    if (actNumber === 4) {
      // Act 4: SIGNATURE — NOUVELLE COMPOSITION RADICALE
      // Same image as Act 2, but COMPLETELY DIFFERENT framing
      // Focus on negative space, upper-right area, editorial crop
      // Creates impression of NEW photograph
      return '72% 28%';
    }
    
    if (actNumber === 5) {
      // Act 5: INVITATION — warm pasta, intimate close-up
      return '48% 52%';
    }
    
    return '50% 50%';
  }

  imageFilter(actNumber: number): string {
    // Lighting atmosphere for each act
    
    if (actNumber === 1) {
      // Act 1: Dark, mysterious, high contrast
      return 'brightness(0.70) contrast(1.25) saturate(0.90)';
    }
    
    if (actNumber === 2) {
      // Act 2: Bright reveal, punchy
      return 'brightness(1.05) contrast(1.15) saturate(1.10)';
    }
    
    if (actNumber === 3) {
      // Act 3a: Vibrant Mediterranean
      return 'brightness(1.10) contrast(1.10) saturate(1.15)';
    }
    
    if (actNumber === 3.5) {
      // Act 3b: Warm restaurant ambiance
      return 'brightness(1.08) contrast(1.05) saturate(1.05)';
    }
    
    if (actNumber === 4) {
      // Act 4: SIGNATURE — dramatic editorial lighting
      // Different from Act 2 despite same image
      return 'brightness(1.15) contrast(1.20) saturate(1.08)';
    }
    
    if (actNumber === 5) {
      // Act 5: Warm, inviting, soft
      return 'brightness(1.12) contrast(1.05) saturate(1.10)';
    }
    
    return 'brightness(1) contrast(1) saturate(1)';
  }

  // ═══ LIGHTING (Cinematic Illumination) ══════════════════════════════

  lightingOpacity() {
    const p = this.scrollProgress();
    
    return {
      vignette: 0.75 + (p * 0.15),                                    // Strengthen vignette
      warmGlow: p > 0.62 && p < 0.90 ? Math.min((p - 0.62) * 3, 1) : 0, // Act 4 signature glow
      lightSweep: p > 0.18 && p < 0.50 ? Math.sin((p - 0.18) * Math.PI / 0.32) * 0.4 : 0, // Act 2 sweep
      textGradient: p < 0.18 || p > 0.82 ? 1 : Math.max(0.4, 1 - ((p - 0.18) / 0.30)), // Strong in Act 1 & 5
    };
  }

  vignetteGradient(): string {
    const p = this.scrollProgress();
    const centerX = 50 + (p * 8);
    const centerY = 45 - (p * 5);
    return `radial-gradient(ellipse 65% 55% at ${centerX}% ${centerY}%, transparent 15%, rgba(26, 26, 26, 0.4) 50%, rgba(26, 26, 26, 0.85) 95%)`;
  }

  lightSweepGradient(): string {
    const p = this.scrollProgress();
    const angle = 45 + (p * 90); // Sweep from 45deg to 135deg
    return `linear-gradient(${angle}deg, transparent 40%, rgba(255, 255, 255, 0.08) 50%, transparent 60%)`;
  }

  // ═══ CONTENT VISIBILITY ═════════════════════════════════════════════

  actOpacity(actNumber: number): number {
    const current = this.currentAct();
    if (current !== actNumber) return 0;
    
    const p = this.scrollProgress();
    const ranges = [
      { start: 0, end: 0.18 },    // Act 1
      { start: 0.18, end: 0.40 }, // Act 2
      { start: 0.40, end: 0.62 }, // Act 3
      { start: 0.62, end: 0.82 }, // Act 4
      { start: 0.82, end: 1.00 }, // Act 5
    ];
    
    const range = ranges[actNumber - 1];
    const actProgress = (p - range.start) / (range.end - range.start);
    
    // Quick fade-in, slower fade-out
    if (actProgress < 0.1) return actProgress * 10;
    if (actProgress > 0.9) return (1 - actProgress) * 10;
    return 1;
  }

  actTransform(actNumber: number): string {
    const opacity = this.actOpacity(actNumber);
    const translateY = (1 - opacity) * 30;
    return `translate3d(0, ${translateY}px, 0)`;
  }

  // Act 3: Sequential pillar reveals
  pillarOpacity(pillarNumber: number): number {
    const p = this.scrollProgress();
    if (p < 0.40 || p >= 0.62) return 0;
    
    const act3Progress = (p - 0.40) / 0.22; // 0-1 within Act 3
    const pillarStart = (pillarNumber - 1) * 0.25; // Stagger: 0, 0.25, 0.5
    const pillarProgress = Math.min(Math.max((act3Progress - pillarStart) / 0.20, 0), 1);
    
    return pillarProgress;
  }

  // ═══ CINEMATIC UI ELEMENTS ═══════════════════════════════════════════

  sceneNumber = computed(() => this.currentAct());

  timecode = computed(() => {
    const p = this.scrollProgress();
    const totalSeconds = Math.floor(p * 60); // 60s total "film"
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });
}
