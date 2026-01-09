import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  const token = auth.token;
  if (token) {
    try {
      await auth.fetchProfile();
      return true;
    } catch (error) {
      auth.logout();
    }
  }

  return router.parseUrl('/login');
};
