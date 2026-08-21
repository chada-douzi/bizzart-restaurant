import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter } from 'rxjs/operators';

interface NavLink {
  label: string;
  routerLink: string;
  fragment?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav
      [class]="navbarClasses()"
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      role="navigation"
      aria-label="Navigation principale"
    >
      <div class="container mx-auto px-4 lg:px-8">
        <div class="flex items-center justify-between h-20">

          <!-- Logo -->
          <a
            routerLink="/"
            (click)="closeMobileMenu()"
            class="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            aria-label="BIZZ'ART — Retour à l'accueil"
          >
            <div
              class="text-2xl lg:text-3xl font-display font-bold tracking-tight transition-colors duration-300"
              [class.text-white]="!isScrolled()"
              [class.text-dark-900]="isScrolled()"
            >
              BIZZ'ART
            </div>
          </a>

          <!-- Desktop Nav -->
          <div class="hidden lg:flex items-center space-x-8" role="menubar">
            @for (link of navLinks; track link.label) {
              @if (link.fragment) {
                <!-- Lien avec fragment : navigue vers / puis scrolle -->
                <a
                  [routerLink]="link.routerLink"
                  [fragment]="link.fragment"
                  (click)="onFragmentLinkClick(link)"
                  class="nav-link font-medium transition-colors duration-300 hover:text-primary-500
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded px-1"
                  [class.text-white]="!isScrolled()"
                  [class.text-dark-700]="isScrolled()"
                  role="menuitem"
                >
                  {{ link.label }}
                </a>
              } @else {
                <a
                  [routerLink]="link.routerLink"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: link.exact ?? false }"
                  class="nav-link font-medium transition-colors duration-300 hover:text-primary-500
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded px-1"
                  [class.text-white]="!isScrolled()"
                  [class.text-dark-700]="isScrolled()"
                  role="menuitem"
                >
                  {{ link.label }}
                </a>
              }
            }

            <a
              routerLink="/reservation"
              class="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700
                     transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              role="menuitem"
            >
              Réserver
            </a>
          </div>

          <!-- Hamburger mobile -->
          <button
            (click)="toggleMobileMenu()"
            class="lg:hidden p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            [class.text-white]="!isScrolled()"
            [class.hover:bg-white/10]="!isScrolled()"
            [class.text-dark-900]="isScrolled()"
            [class.hover:bg-dark-100]="isScrolled()"
            [attr.aria-label]="mobileMenuOpen() ? 'Fermer le menu' : 'Ouvrir le menu'"
            [attr.aria-expanded]="mobileMenuOpen()"
            aria-controls="mobile-menu"
          >
            @if (!mobileMenuOpen()) {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            } @else {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          </button>
        </div>

        <!-- Menu mobile -->
        @if (mobileMenuOpen()) {
          <div
            id="mobile-menu"
            class="lg:hidden pb-6 animate-slide-down"
            role="menu"
            aria-label="Menu mobile"
          >
            <div class="flex flex-col space-y-1 pt-4 border-t border-white/20 bg-dark-950/95 backdrop-blur-md rounded-b-xl px-2 pb-4">
              @for (link of navLinks; track link.label) {
                @if (link.fragment) {
                  <a
                    [routerLink]="link.routerLink"
                    [fragment]="link.fragment"
                    (click)="onFragmentLinkClick(link); closeMobileMenu()"
                    class="mobile-nav-link px-4 py-3 font-medium text-white hover:text-primary-400
                           hover:bg-white/5 rounded-lg transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    role="menuitem"
                  >
                    {{ link.label }}
                  </a>
                } @else {
                  <a
                    [routerLink]="link.routerLink"
                    (click)="closeMobileMenu()"
                    class="mobile-nav-link px-4 py-3 font-medium text-white hover:text-primary-400
                           hover:bg-white/5 rounded-lg transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    role="menuitem"
                  >
                    {{ link.label }}
                  </a>
                }
              }
              <a
                routerLink="/reservation"
                (click)="closeMobileMenu()"
                class="mt-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold text-center
                       hover:bg-primary-700 transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                role="menuitem"
              >
                Réserver une Table
              </a>
            </div>
          </div>
        }

      </div>
    </nav>
  `,
  styles: [`
    .nav-link.active { color: rgb(163 125 88); }
  `],
})
export class NavbarComponent {
  isScrolled     = signal(false);
  mobileMenuOpen = signal(false);

  readonly navLinks: NavLink[] = [
    { label: 'Accueil',      routerLink: '/', exact: true },
    { label: 'Menu',         routerLink: '/menu' },
    { label: 'Galerie',      routerLink: '/', fragment: 'gallery' },
    { label: 'À Propos',     routerLink: '/', fragment: 'about' },
    { label: 'Événements',   routerLink: '/', fragment: 'events' },
    { label: 'Avis',         routerLink: '/', fragment: 'reviews' },
    { label: 'Contact',      routerLink: '/', fragment: 'contact' },
  ];

  constructor(
    private router: Router,
    private viewportScroller: ViewportScroller,
  ) {
    // Scroll vers le fragment APRÈS que la navigation soit terminée et la page rendue.
    // Cela garantit que le scroll fonctionne depuis /menu, /reservation, etc.
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => {
      const tree = this.router.parseUrl(this.router.url);
      const fragment = tree.fragment;
      if (fragment) {
        // Laisser le temps au DOM de rendre les sections lazy-loadées
        setTimeout(() => {
          const el = document.getElementById(fragment);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            // Fallback via ViewportScroller si getElementById échoue
            this.viewportScroller.scrollToAnchor(fragment);
          }
        }, 150);
      }
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 50);
  }

  navbarClasses(): string {
    return this.isScrolled()
      ? 'bg-white/90 backdrop-blur-md shadow-lg border-b border-white/30'
      : 'bg-transparent';
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  /**
   * Gère le clic sur un lien avec fragment.
   * Si on est déjà sur /, on scrolle directement sans naviguer.
   * Sinon, Router navigue vers / et le subscriber NavigationEnd gère le scroll.
   */
  onFragmentLinkClick(link: NavLink): void {
    if (!link.fragment) return;
    const currentPath = this.router.url.split('#')[0].split('?')[0];
    if (currentPath === '/' || currentPath === '') {
      // Déjà sur la homepage — juste scroller
      const el = document.getElementById(link.fragment);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Si on est sur une autre page, le Router navigue vers '/#fragment'
    // et le subscriber dans le constructor gère le scroll
  }
}
