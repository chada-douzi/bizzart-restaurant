import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginCredentials } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-dark-950 flex items-center justify-center px-4">

      <!-- Background pattern -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/20 via-dark-950 to-dark-950"></div>

      <div class="relative z-10 w-full max-w-md">

        <!-- Logo -->
        <div class="text-center mb-10">
          <h1 class="text-4xl font-display font-bold text-white tracking-tight">BIZZ'ART</h1>
          <p class="text-dark-400 text-sm mt-2 tracking-widest uppercase">Espace Administration</p>
        </div>

        <!-- Card -->
        <div class="bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl">

          <h2 class="text-xl font-semibold text-white mb-6">Connexion</h2>

          <!-- Error banner -->
          @if (errorMessage()) {
            <div
              class="mb-5 bg-red-950/60 border border-red-800 rounded-xl px-4 py-3 flex items-start gap-3"
              role="alert"
            >
              <svg class="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span class="text-red-300 text-sm">{{ errorMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="onSubmit()" #loginForm="ngForm" novalidate>

            <!-- Email -->
            <div class="mb-4">
              <label for="email" class="block text-sm font-medium text-dark-300 mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                [(ngModel)]="credentials.email"
                required
                email
                #emailField="ngModel"
                [disabled]="isSubmitting()"
                autocomplete="email"
                placeholder="admin@bizzart.com"
                class="w-full px-4 py-3 bg-dark-800 border rounded-xl text-white placeholder-dark-500
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                [class.border-red-600]="emailField.invalid && emailField.touched"
                [class.border-dark-700]="!(emailField.invalid && emailField.touched)"
              />
              @if (emailField.invalid && emailField.touched) {
                <p class="text-red-400 text-xs mt-1">
                  @if (emailField.errors?.['required']) { L'email est obligatoire. }
                  @else { Veuillez saisir un email valide. }
                </p>
              }
            </div>

            <!-- Password -->
            <div class="mb-6">
              <label for="password" class="block text-sm font-medium text-dark-300 mb-1.5">
                Mot de passe
              </label>
              <div class="relative">
                <input
                  id="password"
                  name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="credentials.password"
                  required
                  minlength="8"
                  #passwordField="ngModel"
                  [disabled]="isSubmitting()"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full px-4 py-3 pr-12 bg-dark-800 border rounded-xl text-white placeholder-dark-500
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  [class.border-red-600]="passwordField.invalid && passwordField.touched"
                  [class.border-dark-700]="!(passwordField.invalid && passwordField.touched)"
                />
                <!-- Toggle password visibility -->
                <button
                  type="button"
                  (click)="showPassword.update(v => !v)"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                  [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                >
                  @if (showPassword()) {
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                </button>
              </div>
              @if (passwordField.invalid && passwordField.touched) {
                <p class="text-red-400 text-xs mt-1">Le mot de passe est obligatoire.</p>
              }
            </div>

            <!-- Submit -->
            <button
              type="submit"
              [disabled]="loginForm.invalid || isSubmitting()"
              class="w-full py-3 px-6 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl
                     transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900"
            >
              @if (isSubmitting()) {
                <span class="flex items-center justify-center gap-2">
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Connexion en cours...
                </span>
              } @else {
                Se connecter
              }
            </button>

          </form>
        </div>

        <!-- Back to site -->
        <div class="text-center mt-6">
          <a href="/" class="text-dark-500 hover:text-dark-300 text-sm transition-colors">
            ← Retour au site
          </a>
        </div>

      </div>
    </div>
  `,
})
export class LoginComponent {
  // ─── State ──────────────────────────────────────────────────────────────────
  isSubmitting = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  credentials: LoginCredentials = {
    email: '',
    password: '',
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  // ─── Submit ───────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.errorMessage.set('');

    if (this.isSubmitting()) return; // prevent double submission

    this.isSubmitting.set(true);

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Verify the logged-in user is admin before redirecting
          if (!this.authService.isAdmin()) {
            this.authService.logout().subscribe();
            this.errorMessage.set('Accès refusé. Seuls les administrateurs peuvent se connecter ici.');
            this.isSubmitting.set(false);
            return;
          }

          // Redirect to returnUrl or dashboard
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin/dashboard';
          // Security: only allow internal return URLs (prevent open redirect)
          const safeReturnUrl = returnUrl.startsWith('/admin') ? returnUrl : '/admin/dashboard';
          this.router.navigateByUrl(safeReturnUrl);
        } else {
          this.errorMessage.set(response.message || 'Email ou mot de passe incorrect.');
          this.isSubmitting.set(false);
        }
      },
      error: (err) => {
        const msg = err?.error?.message;
        if (err?.status === 401) {
          this.errorMessage.set('Email ou mot de passe incorrect.');
        } else if (err?.status === 429) {
          this.errorMessage.set('Trop de tentatives. Veuillez réessayer dans 15 minutes.');
        } else {
          this.errorMessage.set(msg || 'Une erreur est survenue. Veuillez réessayer.');
        }
        this.isSubmitting.set(false);
      },
    });
  }
}
