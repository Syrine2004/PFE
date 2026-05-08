import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PortalSettingsService } from '../services/portal-settings.service';

export const portalGuard = () => {
  const router = inject(Router);
  const portalService = inject(PortalSettingsService);
  const role = sessionStorage.getItem('role');

  // Admins bypass the portal guard — they always have access
  if (role === 'ADMIN') {
    return true;
  }

  const settings = portalService.getCurrentSettings();

  // Check manual closure
  if (settings.isClosed) {
    router.navigate(['/portail-cloture']);
    return false;
  }

  // Check automatic date closure
  if (settings.closingDate) {
    const now = new Date();
    const closeDate = new Date(settings.closingDate);
    if (now > closeDate) {
      router.navigate(['/portail-cloture']);
      return false;
    }
  }

  return true;
};
