import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface Specialite {
    name: string;
    postes: number;
    college: string;
    image?: string;
}

@Component({
    selector: 'app-specialites',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './specialites.component.html',
    styleUrls: ['./specialites.component.scss']
})
export class SpecialitesComponent {
    activeTab: '5ans' | '4ans' | '3ans' = '5ans';

    readonly specialites = {
        '5ans': [
            { name: "INFO_PAGES.SPECIALITES.NAMES.CHIRURGIE_GENERALE", postes: 45, college: "INFO_PAGES.SPECIALITES.COLLEGES.CHIRURGIE", image: "assets/specialites/Chirurgie%20générale.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.MEDECINE_INTERNE", postes: 40, college: "INFO_PAGES.SPECIALITES.COLLEGES.MEDECINE", image: "assets/specialites/medecine%20interne.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.CARDIOLOGIE", postes: 35, college: "INFO_PAGES.SPECIALITES.COLLEGES.CARDIOLOGIE", image: "assets/specialites/Cardiologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.NEUROLOGIE", postes: 25, college: "INFO_PAGES.SPECIALITES.COLLEGES.NEUROLOGIE", image: "assets/specialites/Neurologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.NEPHROLOGIE", postes: 20, college: "INFO_PAGES.SPECIALITES.COLLEGES.NEPHROLOGIE", image: "assets/specialites/Néphrologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.GASTRO_ENTEROLOGIE", postes: 22, college: "INFO_PAGES.SPECIALITES.COLLEGES.GASTRO_ENTEROLOGIE", image: "assets/specialites/Gastro-entérologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.PNEUMOLOGIE", postes: 18, college: "INFO_PAGES.SPECIALITES.COLLEGES.PNEUMOLOGIE", image: "assets/specialites/Pneumologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.PEDIATRIE", postes: 38, college: "INFO_PAGES.SPECIALITES.COLLEGES.PEDIATRIE", image: "assets/specialites/Pédiatrie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.GYNECOLOGIE_OBSTETRIQUE", postes: 42, college: "INFO_PAGES.SPECIALITES.COLLEGES.GYNECOLOGIE", image: "assets/specialites/Gynécologie-Obstétrique.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.UROLOGIE", postes: 15, college: "INFO_PAGES.SPECIALITES.COLLEGES.UROLOGIE", image: "assets/specialites/Urologie.jpg" },
        ],
        '4ans': [
            { name: "INFO_PAGES.SPECIALITES.NAMES.DERMATOLOGIE", postes: 20, college: "INFO_PAGES.SPECIALITES.COLLEGES.DERMATOLOGIE", image: "assets/specialites/Dermatologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.OPHTALMOLOGIE", postes: 22, college: "INFO_PAGES.SPECIALITES.COLLEGES.OPHTALMOLOGIE", image: "assets/specialites/Ophtalmologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.ORL", postes: 18, college: "INFO_PAGES.SPECIALITES.COLLEGES.ORL", image: "assets/specialites/ORL.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.RHUMATOLOGIE", postes: 15, college: "INFO_PAGES.SPECIALITES.COLLEGES.RHUMATOLOGIE", image: "assets/specialites/Rhumatologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.ENDOCRINOLOGIE", postes: 16, college: "INFO_PAGES.SPECIALITES.COLLEGES.ENDOCRINOLOGIE", image: "assets/specialites/Endocrinologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.PSYCHIATRIE", postes: 25, college: "INFO_PAGES.SPECIALITES.COLLEGES.PSYCHIATRIE", image: "assets/specialites/Psychiatrie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.RADIOLOGIE", postes: 30, college: "INFO_PAGES.SPECIALITES.COLLEGES.RADIOLOGIE", image: "assets/specialites/Radiologie.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.ANATOMIE_PATHOLOGIQUE", postes: 12, college: "INFO_PAGES.SPECIALITES.COLLEGES.ANATOMIE_PATHOLOGIQUE", image: "assets/specialites/Anatomie%20pathologique.jpg" },
        ],
        '3ans': [
            { name: "INFO_PAGES.SPECIALITES.NAMES.BIOLOGIE_MEDICALE", postes: 15, college: "INFO_PAGES.SPECIALITES.COLLEGES.BIOLOGIE", image: "assets/specialites/Biologie%20médicale.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.MEDECINE_LEGALE", postes: 10, college: "INFO_PAGES.SPECIALITES.COLLEGES.MEDECINE_LEGALE", image: "assets/specialites/Médecine%20légale.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.MEDECINE_DU_TRAVAIL", postes: 12, college: "INFO_PAGES.SPECIALITES.COLLEGES.MEDECINE_DU_TRAVAIL", image: "assets/specialites/Médecine%20du%20travail.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.SANTE_PUBLIQUE", postes: 14, college: "INFO_PAGES.SPECIALITES.COLLEGES.SANTE_PUBLIQUE", image: "assets/specialites/Santé%20publique.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.MEDECINE_PHYSIQUE", postes: 10, college: "INFO_PAGES.SPECIALITES.COLLEGES.MEDECINE_PHYSIQUE", image: "assets/specialites/Médecine%20physique.jpg" },
            { name: "INFO_PAGES.SPECIALITES.NAMES.PHARMACOLOGIE", postes: 8, college: "INFO_PAGES.SPECIALITES.COLLEGES.PHARMACOLOGIE", image: "assets/specialites/Pharmacologie.jpg" },
        ],
    };

    setTab(tab: '5ans' | '4ans' | '3ans') {
        this.activeTab = tab;
    }
}
