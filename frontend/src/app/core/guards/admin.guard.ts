import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Admin Guard
 * Protects routes that require admin role === 'admin'.
 * Must be used AFTER authGuard.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  // Authenticated but not admin — redirect to homepage (safe, avoids infinite loop)
  if (authService.isAuthenticated()) {
    router.navigate(['/']);
    return false;
  }

  // Not authenticated — redirect to login with returnUrl
  router.navigate(['/admin/login'], {
    queryParams: { returnUrl: state.url }
  });

  return false;
};

