import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Auth Token Interceptor
 * Adds authentication credentials to outgoing requests
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Clone request and add withCredentials for cookie-based auth
  const authReq = req.clone({
    withCredentials: true
  });

  return next(authReq);
};
