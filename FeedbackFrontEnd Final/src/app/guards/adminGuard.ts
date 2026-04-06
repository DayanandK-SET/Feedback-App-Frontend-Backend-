import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../Services/token.service';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  const token = tokenService.getToken();
  const role = tokenService.getRole();

  if (token && role === 'Admin') {
    return true;
  }

  // Redirect to the correct dashboard based on role
  if (token) {
    if (role === 'User') router.navigateByUrl('/user-dashboard');
    else router.navigateByUrl('/dashboard');
  } else {
    router.navigateByUrl('');
  }

  return false;
};
