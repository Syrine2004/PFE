import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http'; 
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideTranslateService, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader, provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { Observable, of } from 'rxjs';

registerLocaleData(localeFr, 'fr');
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor'; // Import de l'intercepteur
import { LanguageService } from './core/services/language.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]) 
    ),
    provideAnimations(),
    provideTranslateService({
      defaultLanguage: 'fr',
      loader: {
        provide: TranslateLoader,
        useFactory: () => new TranslateHttpLoader()
      }
    }),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json'
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (langService: LanguageService) => () => {
        // Just injecting the service will trigger its constructor and apply the stored language
        return Promise.resolve();
      },
      deps: [LanguageService],
      multi: true
    },
    { provide: LOCALE_ID, useValue: 'fr' }
  ]
};