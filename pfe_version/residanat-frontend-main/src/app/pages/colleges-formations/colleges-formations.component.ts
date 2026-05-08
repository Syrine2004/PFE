import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-colleges-formations',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './colleges-formations.component.html',
    styleUrls: ['./colleges-formations.component.scss']
})
export class CollegesFormationsComponent {
    private translate = inject(TranslateService);

    get colleges() {
        return [0, 1, 2, 3, 4, 5].map(index => ({
            name: this.translate.instant(`INFO_PAGES.COLLEGES_FORMATIONS.COLLEGES.${index}.NAME`),
            president: this.translate.instant(`INFO_PAGES.COLLEGES_FORMATIONS.COLLEGES.${index}.PRESIDENT`),
            specialites: this.translate.instant(`INFO_PAGES.COLLEGES_FORMATIONS.COLLEGES.${index}.SPECIALITES`) as string[],
            stages: this.translate.instant(`INFO_PAGES.COLLEGES_FORMATIONS.COLLEGES.${index}.STAGES`) as string[],
        }));
    }
}
