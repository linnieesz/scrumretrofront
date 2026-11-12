import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../config/api.config';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/roles'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Só anexa o JWT em chamadas para a nossa API (nunca vaza o token para terceiros).
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  const token = authService.getToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  const isPublic = PUBLIC_PATHS.some(p => req.url.includes(p));

  return next(authReq).pipe(
    catchError((err: unknown) => {
      // Token expirado/inválido, ou usuário desativado/rebaixado: encerra a sessão e volta ao login.
      if (err instanceof HttpErrorResponse && err.status === 401 && !isPublic) {
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
