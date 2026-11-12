import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../models';

/** Uso: canActivate: [roleGuard], data: { roles: ['Admin', 'Manager'] }. Lê o papel real da sessão. */
export const roleGuard: CanActivateFn = route => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data?.['roles'] ?? []) as UserRole[];
  const role = authService.getCurrentUser()?.role;

  if (role && allowedRoles.includes(role)) return true;

  // Sem permissão: volta para a lista de projetos (o backend também valida).
  return router.createUrlTree(['/projects']);
};
