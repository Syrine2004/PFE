import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const adminGuard = () => {
  const router = inject(Router);
  const role = sessionStorage.getItem('role');

  if (role === 'ADMIN') {
    return true;
  } else {
    router.navigate(['/dashboard']);
    return false;
  }
};