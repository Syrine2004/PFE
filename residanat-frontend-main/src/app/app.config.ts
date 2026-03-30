import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; 
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr, 'fr');

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor'; // Import de l'intercepteur

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(
      // On configure HttpClient pour utiliser notre vigile (l'intercepteur)
      withInterceptors([authInterceptor]) 
    ),
    { provide: LOCALE_ID, useValue: 'fr' }
  ]
};