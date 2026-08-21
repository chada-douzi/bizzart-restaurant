import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';
import { adminGuard } from '../core/guards/admin.guard';

export const adminRoutes: Routes = [
  // ─── Public admin route — no guards, no shell ────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },

  // ─── Protected admin shell — all children share the layout ───────────────────
  // authGuard: requires authentication
  // adminGuard: requires role === 'admin'
  {
    path: '',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'reservations',
        loadComponent: () => import('./features/reservations/reservations.component').then(m => m.AdminReservationsComponent)
      },
      {
        path: 'menu',
        loadComponent: () => import('./features/menu/menu.component').then(m => m.AdminMenuComponent)
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/reviews/reviews.component').then(m => m.AdminReviewsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.AdminSettingsComponent)
      },
      {
        path: 'gallery',
        loadComponent: () => import('./features/gallery/gallery.component').then(m => m.AdminGalleryComponent)
      },
      {
        path: 'photo-validation',
        loadComponent: () => import('./features/photo-validation/photo-validation.component').then(m => m.PhotoValidationComponent)
      },
      {
        path: 'gallery-audit',
        loadComponent: () => import('./features/gallery-audit/gallery-audit.component').then(m => m.GalleryAuditComponent)
      }
    ]
  }
];
