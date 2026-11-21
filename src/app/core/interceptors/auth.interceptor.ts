import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../config/api.config';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/roles', '/auth/companies'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Só anexa o JWT em chamadas para a nossa API (nunca vaza o token para terceiros).
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  const token = authService.getToken();
  const isPublic = PUBLIC_PATHS.some(p => req.url.includes(p));

  // Rotas públicas (login, cadastro, papéis, empresas) NÃO levam o token: um token velho no localStorage não pode
  // interferir nelas e, sem o header Authorization, o GET vira requisição "simples" (sem preflight de CORS).
  const authReq = token && !isPublic ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      // Token expirado/inválido, ou usuário desativado/rebaixado: encerra a sessão e volta ao login.
      // Só vale se existia sessão (token enviado) e a rota não é pública: um 401 numa chamada sem login
      // (ex.: tela de cadastro) não pode "deslogar" nem redirecionar ninguém.
      if (err instanceof HttpErrorResponse && err.status === 401 && !isPublic && token) {
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
