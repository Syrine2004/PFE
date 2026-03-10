import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard = () => {
  const router = inject(Router);
  const token = sessionStorage.getItem('token');

  if (token) {
    return true;
  } else {
    router.navigate(['/connexion']);
    return false;
  }
};