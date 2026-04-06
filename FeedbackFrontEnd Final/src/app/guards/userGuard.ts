import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../Services/token.service';

export const userGuard: CanActivateFn = () => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  const token = tokenService.getToken();
  const role = tokenService.getRole();

  if (token && role === 'User') {
    return true;
  }

  // Redirect to the correct dashboard based on role
  if (token) {
    if (role === 'Admin') router.navigateByUrl('/admin');
    else router.navigateByUrl('/dashboard');
  } else {
    router.navigateByUrl('');
  }

  return false;
};
