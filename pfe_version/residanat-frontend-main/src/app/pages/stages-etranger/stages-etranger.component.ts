import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-stages-etranger',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule],
    templateUrl: './stages-etranger.component.html',
    styleUrl: './stages-etranger.component.scss'
})
export class StagesEtrangerComponent {
    private translate = inject(TranslateService);

    get conditions() {
        return [0, 1, 2, 3, 4, 5].map(index => 
            this.translate.instant(`INFO_PAGES.STAGES_ETRANGER.CONDITIONS.${index}`)
        );
    }

    get etapes() {
        return [
            {
                number: "01",
                title: this.translate.instant('INFO_PAGES.STAGES_ETRANGER.ETAPES.0.TITLE'),
                description: this.translate.instant('INFO_PAGES.STAGES_ETRANGER.ETAPES.0.DESC'),
            },
            {
                number: "02",
                title: this.translate.instant('INFO_PAGES.STAGES_ETRANGER.ETAPES.1.TITLE'),
                description: this.translate.instant('INFO_PAGES.STAGES_ETRANGER.ETAPES.1.DESC'),
            },
            {
                number: "03",
                title: this.translate.instant('INFO_PAGES.STAGES_ETRANGER.ETAPES.2.TITLE'),
                description: this.translate.instant('INFO_PAGES.STAGES_ETRANGER.ETAPES.2.DESC'),
            },
            {
                number: "04",
                title: this.translate.instant('INFO_PAGES.STAGES_ETRANGER.ETAPES.3.TITLE'),
                description: this.translate.instant('INFO_PAGES.STAGES_ETRANGER.ETAPES.3.DESC'),
            },
        ];
    }
}
