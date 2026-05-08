import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-textes-reglementaires',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './textes-reglementaires.component.html',
    styleUrls: ['./textes-reglementaires.component.scss']
})
export class TextesReglementairesComponent {
    private translate = inject(TranslateService);

    get arretes() {
        return [0, 1, 2, 3].map(index => ({
            title: this.translate.instant(`INFO_PAGES.TEXTES_REGLEMENTAIRES.ARRETES.${index}.TITLE`),
            description: this.translate.instant(`INFO_PAGES.TEXTES_REGLEMENTAIRES.ARRETES.${index}.DESC`),
            date: this.translate.instant(`INFO_PAGES.TEXTES_REGLEMENTAIRES.ARRETES.${index}.DATE`),
            type: this.translate.instant(`INFO_PAGES.TEXTES_REGLEMENTAIRES.ARRETES.${index}.TYPE`),
        }));
    }

    get postesParSpecialite() {
        return [0, 1, 2, 3, 4, 5, 6, 7].map(index => ({
            specialite: this.translate.instant(`INFO_PAGES.TEXTES_REGLEMENTAIRES.POSTES.${index}.SPEC`),
            postes: this.translate.instant(`INFO_PAGES.TEXTES_REGLEMENTAIRES.POSTES.${index}.POSTES`),
            faculte: this.translate.instant(`INFO_PAGES.TEXTES_REGLEMENTAIRES.POSTES.${index}.FAC`),
        }));
    }
}
