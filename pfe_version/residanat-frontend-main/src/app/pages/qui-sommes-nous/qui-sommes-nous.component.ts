import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-qui-sommes-nous',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './qui-sommes-nous.component.html',
    styleUrls: ['./qui-sommes-nous.component.scss']
})
export class QuiSommesNousComponent {
    private translate = inject(TranslateService);

    get missions() {
        return [
            {
                icon: 'building',
                title: this.translate.instant('INFO_PAGES.QUI_SOMMES_NOUS.MISSIONS.0.TITLE'),
                description: this.translate.instant('INFO_PAGES.QUI_SOMMES_NOUS.MISSIONS.0.DESC'),
            },
            {
                icon: 'target',
                title: this.translate.instant('INFO_PAGES.QUI_SOMMES_NOUS.MISSIONS.1.TITLE'),
                description: this.translate.instant('INFO_PAGES.QUI_SOMMES_NOUS.MISSIONS.1.DESC'),
            },
            {
                icon: 'users',
                title: this.translate.instant('INFO_PAGES.QUI_SOMMES_NOUS.MISSIONS.2.TITLE'),
                description: this.translate.instant('INFO_PAGES.QUI_SOMMES_NOUS.MISSIONS.2.DESC'),
            },
            {
                icon: 'scale',
                title: this.translate.instant('INFO_PAGES.QUI_SOMMES_NOUS.MISSIONS.3.TITLE'),
                description: this.translate.instant('INFO_PAGES.QUI_SOMMES_NOUS.MISSIONS.3.DESC'),
            },
        ];
    }
}
