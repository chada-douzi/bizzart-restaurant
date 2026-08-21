import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: 'dashboard' | 'reservations' | 'menu' | 'reviews' | 'settings' | 'gallery';
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-dark-50 flex">

      <!-- ── Sidebar overlay (mobile) ────────────────────────────────────────── -->
      @if (sidebarOpen()) {
        <div
          class="fixed inset-0 bg-black/50 z-20 lg:hidden"
          (click)="closeSidebar()"
          aria-hidden="true"
        ></div>
      }

      <!-- ── Sidebar ──────────────────────────────────────────────────────────── -->
      <aside
        class="fixed top-0 left-0 h-full w-64 bg-dark-950 text-white z-30 flex flex-col
               transition-transform duration-300 ease-in-out
               lg:translate-x-0 lg:static lg:z-auto"
        [class.-translate-x-full]="!sidebarOpen()"
        [class.translate-x-0]="sidebarOpen()"
        role="navigation"
        aria-label="Navigation admin"
      >
        <!-- Logo -->
        <div class="px-6 py-5 border-b border-dark-800">
          <a routerLink="/admin/dashboard" class="flex items-center gap-3 group" (click)="closeSidebar()">
            <div class="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shrink-0">
              <span class="text-white font-display font-bold text-sm">B</span>
            </div>
            <div>
              <p class="text-white font-display font-bold text-lg leading-tight tracking-tight">BIZZ'ART</p>
              <p class="text-dark-400 text-xs">Administration</p>
            </div>
          </a>
        </div>

        <!-- Nav links -->
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary-600/20 text-primary-400 border-primary-500"
              [routerLinkActiveOptions]="{ exact: false }"
              (click)="closeSidebar()"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-dark-300 hover:bg-dark-800 hover:text-white
                     border border-transparent transition-all duration-150"
              [attr.aria-label]="item.label"
            >
              <span class="shrink-0 w-5 h-5 flex items-center justify-center">
                <ng-container [ngSwitch]="item.icon">
                  <!-- Dashboard -->
                  <svg *ngSwitchCase="'dashboard'" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <!-- Reservations -->
                  <svg *ngSwitchCase="'reservations'" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <!-- Menu -->
                  <svg *ngSwitchCase="'menu'" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <!-- Reviews -->
                  <svg *ngSwitchCase="'reviews'" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <!-- Settings -->
                  <svg *ngSwitchCase="'settings'" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <!-- Gallery -->
                  <svg *ngSwitchCase="'gallery'" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </ng-container>
              </span>
              {{ item.label }}
            </a>
          }
        </nav>

        <!-- User info + Logout -->
        <div class="px-3 py-4 border-t border-dark-800">
          <!-- User info -->
          @if (currentUser()) {
            <div class="px-3 py-2 mb-2">
              <p class="text-white text-sm font-medium truncate">
                {{ currentUser()!.firstName }} {{ currentUser()!.lastName }}
              </p>
              <p class="text-dark-400 text-xs truncate">{{ currentUser()!.email }}</p>
            </div>
          }

          <!-- Logout button -->
          <button
            (click)="logout()"
            [disabled]="isLoggingOut()"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                   text-dark-300 hover:bg-red-950/40 hover:text-red-400
                   border border-transparent transition-all duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Se déconnecter"
          >
            @if (isLoggingOut()) {
              <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            } @else {
              <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
            Se déconnecter
          </button>

          <!-- Back to site -->
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 flex items-center gap-3 px-3 py-2 rounded-xl text-xs
                   text-dark-500 hover:text-dark-300 transition-colors"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Voir le site
          </a>
        </div>
      </aside>

      <!-- ── Main content ──────────────────────────────────────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 lg:ml-0">

        <!-- Top header (mobile + desktop) -->
        <header class="bg-white border-b border-dark-100 px-4 lg:px-8 h-16 flex items-center justify-between sticky top-0 z-10">
          <!-- Mobile: hamburger -->
          <button
            (click)="toggleSidebar()"
            class="lg:hidden p-2 rounded-lg text-dark-600 hover:bg-dark-50 transition-colors"
            aria-label="Ouvrir la navigation"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <!-- Desktop: page title placeholder -->
          <div class="hidden lg:flex items-center gap-2">
            <span class="text-dark-400 text-sm">BIZZ'ART</span>
            <span class="text-dark-300">/</span>
            <span class="text-dark-800 text-sm font-medium">Administration</span>
          </div>

          <!-- Right: user badge (desktop) -->
          @if (currentUser()) {
            <div class="hidden lg:flex items-center gap-3">
              <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span class="text-white text-xs font-bold uppercase">
                  {{ currentUser()!.firstName.charAt(0) }}{{ currentUser()!.lastName.charAt(0) }}
                </span>
              </div>
              <span class="text-dark-700 text-sm font-medium">
                {{ currentUser()!.firstName }} {{ currentUser()!.lastName }}
              </span>
            </div>
          }
        </header>

        <!-- Page content -->
        <main class="flex-1 p-4 lg:p-8 overflow-auto">
          <router-outlet />
        </main>
      </div>

    </div>
  `,
})
export class AdminLayoutComponent {
  sidebarOpen = signal(false);
  isLoggingOut = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',     path: '/admin/dashboard',    icon: 'dashboard'     },
    { label: 'Réservations',  path: '/admin/reservations', icon: 'reservations'  },
    { label: 'Menu',          path: '/admin/menu',         icon: 'menu'          },
    { label: 'Galerie',       path: '/admin/gallery',      icon: 'gallery'       },
    { label: 'Avis',          path: '/admin/reviews',      icon: 'reviews'       },
    { label: 'Paramètres',    path: '/admin/settings',     icon: 'settings'      },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  get currentUser() {
    return this.authService.currentUser;
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  // Close sidebar on Escape key
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }

  logout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    this.authService.logout().subscribe({
      next: () => this.isLoggingOut.set(false),
      error: () => {
        // Even if the API call fails, clear local auth and redirect
        this.isLoggingOut.set(false);
        this.router.navigate(['/admin/login']);
      },
    });
  }
}
