import { Routes } from '@angular/router';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'menu',
    loadComponent: () => import('./features/menu/menu.component').then(m => m.MenuComponent)
  },
  {
    path: 'reservation',
    loadComponent: () => import('./features/reservation/reservation.component').then(m => m.ReservationComponent)
  },
  {
    path: 'mentions-legales',
    loadComponent: () => import('./features/legal/mentions-legales.component').then(m => m.MentionsLegalesComponent)
  },
  {
    path: 'confidentialite',
    loadComponent: () => import('./features/legal/confidentialite.component').then(m => m.ConfidentialiteComponent)
  },

  // Admin routes (protected by authGuard + adminGuard in admin.routes.ts)
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
  },

  // 404 — proper page instead of silent redirect
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
