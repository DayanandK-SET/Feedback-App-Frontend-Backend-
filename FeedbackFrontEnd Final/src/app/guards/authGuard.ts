// import { CanActivateFn, Router } from '@angular/router';
// import { inject } from '@angular/core';
// import { TokenService } from '../Services/token.service';

// export const authGuard: CanActivateFn = () => {

//   const router = inject(Router);
//   const tokenService = inject(TokenService);

//   const token = tokenService.getToken();
//   const role = tokenService.getRole();

//   if (token && role === 'Creator') {
//     return true;
//   }

//   router.navigateByUrl('');
//   return false;

// };

import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../Services/token.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  const token = tokenService.getToken();
  const role = tokenService.getRole();

  // Both Creator and Admin can access protected routes
  if (token && (role === 'Creator' || role === 'Admin')) {
    return true;
  }

  router.navigateByUrl('');
  return false;
};
