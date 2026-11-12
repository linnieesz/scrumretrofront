import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Sessão válida = token presente e não expirado (o AuthService limpa a sessão expirada).
  return authService.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
