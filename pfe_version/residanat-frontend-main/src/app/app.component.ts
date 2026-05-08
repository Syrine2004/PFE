import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DOCUMENT } from '@angular/common';
import { GovernmentHeaderComponent } from './components/government-header/government-header.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: []
})
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);
  private document = inject(DOCUMENT);
  title = 'Residanat TN';

  ngOnInit() {
    // Initial direction is already handled by LanguageService in appConfig/Initializer
    this.translate.onLangChange.subscribe(event => {
      this.updateDirection(event.lang);
    });
  }

  private updateDirection(lang: string) {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.document.documentElement.dir = dir;
    this.document.documentElement.lang = lang;
  }
}
