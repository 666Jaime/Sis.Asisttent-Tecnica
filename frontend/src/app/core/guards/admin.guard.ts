import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de Ruta de Angular moderno y funcional.
 * Protege las rutas administrativas validando que el usuario esté logueado como Admin.
 */
export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.currentUser()?.admin) {
    return true;
  }

  loggerWarningRedirect(router);
  return false;
};

function loggerWarningRedirect(router: Router) {
  console.warn('Acceso denegado: Se requiere privilegios de Administrador para acceder a esta sección.');
  router.navigate(['/login']);
}
