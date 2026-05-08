import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANG_KEY = 'app-language';
  
  currentLang = signal<string>(this.getStoredLang());

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['fr', 'ar']);
    this.applyLanguage(this.currentLang());
  }

  setLanguage(lang: string) {
    this.currentLang.set(lang);
    this.applyLanguage(lang);
    localStorage.setItem(this.LANG_KEY, lang);
  }

  private applyLanguage(lang: string) {
    this.translate.use(lang);
    
    // Handle RTL
    const htmlTag = document.documentElement;
    if (lang === 'ar') {
      htmlTag.setAttribute('dir', 'rtl');
      htmlTag.setAttribute('lang', 'ar');
    } else {
      htmlTag.setAttribute('dir', 'ltr');
      htmlTag.setAttribute('lang', 'fr');
    }
  }

  private getStoredLang(): string {
    const stored = localStorage.getItem(this.LANG_KEY);
    return stored || 'fr';
  }
}
