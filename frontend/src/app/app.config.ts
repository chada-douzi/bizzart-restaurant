import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { SettingsService } from './core/services/settings.service';

/**
 * Loads public restaurant settings before the app renders.
 * firstValueFrom() replaces the deprecated .toPromise().
 * catchError in loadPublicSettings() ensures a failing API never blocks startup.
 */
function initializeSettings(settingsService: SettingsService) {
  return () => firstValueFrom(settingsService.loadPublicSettings()).catch(() => undefined);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      })
    ),
    // Register HTTP interceptors:
    // 1. authTokenInterceptor — adds withCredentials:true to every request (cookie-based auth)
    // 2. httpErrorInterceptor — handles 401/403/404/500 globally
    provideHttpClient(
      withInterceptors([authTokenInterceptor, httpErrorInterceptor])
    ),
    // Load restaurant settings at startup so all components have them immediately
    {
      provide: APP_INITIALIZER,
      useFactory: initializeSettings,
      deps: [SettingsService],
      multi: true,
    },
  ]
};

