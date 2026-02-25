import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const adminGuard = () => {
  const router = inject(Router);
  const role = localStorage.getItem('role');

  if (role === 'ADMIN') {
    return true;
  } else {
    router.navigate(['/dashboard']);
    return false;
  }
};