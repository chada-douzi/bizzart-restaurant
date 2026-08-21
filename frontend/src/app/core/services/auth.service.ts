import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { HttpService } from './http.service';
import { User, LoginCredentials, AuthResponse } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  constructor(
    private http: HttpService,
    private router: Router
  ) {
    this.checkAuthStatus();
  }

  login(credentials: LoginCredentials): Observable<ApiResponse<AuthResponse>> {
    this.isLoading.set(true);
    
    return this.http.post<AuthResponse>('/auth/login', credentials).pipe(
      tap((response: ApiResponse<AuthResponse>) => {
        if (response.success && response.data) {
          this.setCurrentUser(response.data.user);
          this.isAuthenticated.set(true);
        }
        this.isLoading.set(false);
      })
    );
  }

  logout(): Observable<ApiResponse<void>> {
    return this.http.post<void>('/auth/logout', {}).pipe(
      tap(() => {
        this.clearAuth();
        this.router.navigate(['/admin/login']);
      })
    );
  }

  getCurrentUser(): Observable<ApiResponse<User>> {
    return this.http.get<User>('/auth/me').pipe(
      tap((response: ApiResponse<User>) => {
        if (response.success && response.data) {
          this.setCurrentUser(response.data);
          this.isAuthenticated.set(true);
        }
      })
    );
  }

  /**
   * Called once at app startup.
   *
   * Strategy:
   * 1. If localStorage has a cached user profile, restore it immediately
   *    so the UI renders without flicker.
   * 2. Always call GET /api/auth/me to validate the HttpOnly cookie against
   *    the backend. This detects: expired JWT, deleted/deactivated user,
   *    role change.
   * 3. On 401 (handled by httpErrorInterceptor which re-throws), clear the
   *    stale localStorage cache and mark the user as unauthenticated.
   *    The guard will redirect to /admin/login when the user navigates to a
   *    protected route — we do NOT force-navigate here to avoid interrupting
   *    public page loads.
   */
  private checkAuthStatus(): void {
    // Step 1: Restore cached profile for instant UI (no JWT stored here)
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData) as User;
        this.setCurrentUser(user);
        this.isAuthenticated.set(true);
      } catch {
        this.clearAuth();
        return;
      }
    }

    // Step 2: Validate session with backend via HttpOnly cookie
    this.http.get<User>('/auth/me').pipe(
      tap((response: ApiResponse<User>) => {
        if (response.success && response.data) {
          // Refresh local cache with up-to-date data from DB
          // (catches role changes, name updates, etc.)
          this.setCurrentUser(response.data);
          this.isAuthenticated.set(true);
        } else {
          // Unexpected: success=false without an HTTP error
          this.clearAuth();
        }
      }),
      catchError(() => {
        // 401 / 403 / network error — session is invalid
        // Clear stale cache; guard will redirect to login on next navigation
        this.clearAuth();
        return of(null);
      })
    ).subscribe();
  }

  private setCurrentUser(user: User): void {
    this.currentUser.set(user);
    // Only the public profile is stored — never the JWT
    localStorage.setItem('user', JSON.stringify(user));
  }

  private clearAuth(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('user');
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    return user?.role === 'admin';
  }

  isManager(): boolean {
    const user = this.currentUser();
    return user?.role === 'manager';
  }
}
