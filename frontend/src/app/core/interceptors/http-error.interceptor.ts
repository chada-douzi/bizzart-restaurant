import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * HTTP Error Interceptor
 * Handles errors globally
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            // Unauthorized - redirect to login
            errorMessage = 'Unauthorized access. Please log in.';
            if (router.url.startsWith('/admin') && !router.url.includes('/login')) {
              router.navigate(['/admin/login']);
            }
            break;
          case 403:
            errorMessage = 'Access forbidden.';
            break;
          case 404:
            errorMessage = 'Resource not found.';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          default:
            if (error.error && error.error.message) {
              errorMessage = error.error.message;
            }
        }
      }

      console.error('HTTP Error:', errorMessage, error);
      return throwError(() => error);
    })
  );
};
