import {
  Component,
  OnDestroy,
  AfterViewInit,
  signal,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../../core/directives/scroll-reveal.directive';
import { KITCHEN_VIDEO_SRC, KITCHEN_VIDEO_POSTER } from '../home.data';

@Component({
  selector: 'app-kitchen-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  template: `
    <section id="notre-cuisine" class="py-20 lg:py-32 bg-dark-950 overflow-hidden">
      <div class="container mx-auto px-4 lg:px-8">

        <!-- Header -->
        <div class="text-center mb-14 lg:mb-20" appScrollReveal>
          <span class="text-primary-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block">
            Notre cuisine
          </span>
          <h2 class="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
            De notre cuisine à votre table
          </h2>
          <div class="w-24 h-0.5 bg-primary-600 mx-auto mb-6"></div>
          <p class="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Pizzas napolitaines, grillades généreuses, fruits de mer frais, pâtes maison et snacking —
            découvrez la diversité de BIZZ'ART à travers nos créations du quotidien.
          </p>
        </div>

        <!-- Video container -->
        <div class="relative max-w-4xl mx-auto" appScrollReveal>
          <div class="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 bg-dark-900
                      aspect-[9/16] sm:aspect-video">

            <!-- Poster / fallback visible before play -->
            <img
              [src]="kitchenPoster"
              alt="Notre cuisine BIZZ'ART — pizza thon four à bois"
              class="absolute inset-0 w-full h-full object-cover"
              [class.opacity-100]="!isPlaying()"
              [class.opacity-0]="isPlaying()"
              style="transition: opacity 0.5s ease;"
              loading="lazy"
            />

            <!-- Video element -->
            <video
              #kitchenVideo
              class="absolute inset-0 w-full h-full object-cover"
              [class.opacity-0]="!isPlaying() && !hasStarted()"
              [class.opacity-100]="isPlaying() || hasStarted()"
              style="transition: opacity 0.5s ease;"
              loop
              playsinline
              [muted]="isMuted()"
              [attr.poster]="kitchenPoster"
              preload="none"
              (play)="onPlay()"
              (pause)="onPause()"
              (ended)="onPause()"
              (error)="onVideoError()"
            >
              <source [src]="kitchenVideoSrc" type="video/mp4" />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>

            <!-- Gradient overlay (visible when paused) -->
            <div
              class="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-transparent to-transparent
                     pointer-events-none"
              [class.opacity-100]="!isPlaying()"
              [class.opacity-0]="isPlaying()"
              style="transition: opacity 0.5s ease;"
            ></div>

            <!-- Play / Pause button overlay -->
            @if (!videoErrored()) {
              <div class="absolute inset-0 flex items-center justify-center">
                <button
                  (click)="togglePlay()"
                  class="group w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50
                         flex items-center justify-center hover:bg-white/30 hover:border-white
                         transition-all duration-300 transform hover:scale-110
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  [class.opacity-100]="!isPlaying()"
                  [class.opacity-0]="isPlaying()"
                  [class.pointer-events-none]="isPlaying()"
                  style="transition: opacity 0.4s ease;"
                  [attr.aria-label]="isPlaying() ? 'Mettre en pause' : 'Lire la vidéo'"
                >
                  <!-- Play icon -->
                  @if (!isPlaying()) {
                    <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  }
                </button>
              </div>

              <!-- Controls bar (visible while playing) -->
              @if (isPlaying()) {
                <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between
                            animate-fade-in">
                  <!-- Pause button -->
                  <button
                    (click)="togglePlay()"
                    class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center
                           text-white hover:bg-black/70 transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Mettre en pause"
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  </button>

                  <!-- Mute / Unmute button -->
                  <button
                    (click)="toggleMute()"
                    class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center
                           text-white hover:bg-black/70 transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    [attr.aria-label]="isMuted() ? 'Activer le son' : 'Couper le son'"
                  >
                    @if (isMuted()) {
                      <!-- Muted icon -->
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.987 8.987 0 0017.22 18L19 19.73 20.27 18.46 5.54 3.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                      </svg>
                    } @else {
                      <!-- Unmuted icon -->
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                      </svg>
                    }
                  </button>
                </div>
              }
            }

            <!-- Error fallback message -->
            @if (videoErrored()) {
              <div class="absolute inset-0 flex items-center justify-center bg-dark-900/80">
                <p class="text-white/60 text-sm text-center px-6">
                  La vidéo n'est pas disponible pour le moment.
                </p>
              </div>
            }
          </div>

          <!-- Caption -->
          <p class="text-center text-white/40 text-sm mt-4 italic">
            @BIZZART_MONASTIR — From our kitchen
          </p>
        </div>

        <!-- Feature pills -->
        <div class="flex flex-wrap justify-center gap-3 mt-14" appScrollReveal>
          @for (item of highlights; track item.label) {
            <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20
                         bg-white/5 text-white/70 text-sm font-medium backdrop-blur-sm">
              <span class="text-primary-400" aria-hidden="true">{{ item.icon }}</span>
              {{ item.label }}
            </span>
          }
        </div>

      </div>
    </section>
  `,
})
export class KitchenSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('kitchenVideo') private videoRef?: ElementRef<HTMLVideoElement>;

  readonly kitchenVideoSrc = KITCHEN_VIDEO_SRC;
  readonly kitchenPoster   = KITCHEN_VIDEO_POSTER;

  isPlaying    = signal(false);
  hasStarted   = signal(false);
  isMuted      = signal(true);
  videoErrored = signal(false);

  readonly highlights = [
    { icon: '🍕', label: 'Pizzas four à bois' },
    { icon: '🦐', label: 'Fruits de mer' },
    { icon: '🥩', label: 'Grillades & viandes' },
    { icon: '🍝', label: 'Pâtes & risottos' },
    { icon: '🥗', label: 'Salades & snacking' },
    { icon: '🎁', label: 'À emporter' },
  ];

  isBrowser = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    // Nothing to autoplay here — user must click
  }

  ngOnDestroy(): void {
    const vid = this.videoRef?.nativeElement;
    if (vid) {
      vid.pause();
      vid.src = '';
      vid.load();
    }
  }

  togglePlay(): void {
    if (!this.isBrowser) return;
    const vid = this.videoRef?.nativeElement;
    if (!vid) return;

    if (vid.paused) {
      vid.play().then(() => {
        this.isPlaying.set(true);
        this.hasStarted.set(true);
      }).catch(() => { /* blocked */ });
    } else {
      vid.pause();
      this.isPlaying.set(false);
    }
  }

  toggleMute(): void {
    const vid = this.videoRef?.nativeElement;
    if (!vid) return;
    vid.muted = !vid.muted;
    this.isMuted.set(vid.muted);
  }

  onPlay(): void {
    this.isPlaying.set(true);
    this.hasStarted.set(true);
  }

  onPause(): void {
    this.isPlaying.set(false);
  }

  onVideoError(): void {
    this.videoErrored.set(true);
    this.isPlaying.set(false);
  }
}
