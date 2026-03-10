import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Specialite {
    name: string;
    postes: number;
    college: string;
}

@Component({
    selector: 'app-specialites',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './specialites.component.html',
    styleUrls: ['./specialites.component.scss']
})
export class SpecialitesComponent {
    activeTab: '5ans' | '4ans' | '3ans' = '5ans';

    readonly specialites = {
        '5ans': [
            { name: "Chirurgie generale", postes: 45, college: "College de Chirurgie" },
            { name: "Medecine interne", postes: 40, college: "College de Medecine" },
            { name: "Cardiologie", postes: 35, college: "College de Cardiologie" },
            { name: "Neurologie", postes: 25, college: "College de Neurologie" },
            { name: "Nephrologie", postes: 20, college: "College de Nephrologie" },
            { name: "Gastro-enterologie", postes: 22, college: "College de Gastro-enterologie" },
            { name: "Pneumologie", postes: 18, college: "College de Pneumologie" },
            { name: "Pediatrie", postes: 38, college: "College de Pediatrie" },
            { name: "Gynecologie-Obstetrique", postes: 42, college: "College de Gynecologie" },
            { name: "Urologie", postes: 15, college: "College d'Urologie" },
        ],
        '4ans': [
            { name: "Dermatologie", postes: 20, college: "College de Dermatologie" },
            { name: "Ophtalmologie", postes: 22, college: "College d'Ophtalmologie" },
            { name: "ORL", postes: 18, college: "College d'ORL" },
            { name: "Rhumatologie", postes: 15, college: "College de Rhumatologie" },
            { name: "Endocrinologie", postes: 16, college: "College d'Endocrinologie" },
            { name: "Psychiatrie", postes: 25, college: "College de Psychiatrie" },
            { name: "Radiologie", postes: 30, college: "College de Radiologie" },
            { name: "Anatomie pathologique", postes: 12, college: "College d'Anatomie Pathologique" },
        ],
        '3ans': [
            { name: "Biologie medicale", postes: 15, college: "College de Biologie" },
            { name: "Medecine legale", postes: 10, college: "College de Medecine Legale" },
            { name: "Medecine du travail", postes: 12, college: "College de Medecine du Travail" },
            { name: "Sante publique", postes: 14, college: "College de Sante Publique" },
            { name: "Medecine physique", postes: 10, college: "College de Medecine Physique" },
            { name: "Pharmacologie", postes: 8, college: "College de Pharmacologie" },
        ],
    };

    setTab(tab: '5ans' | '4ans' | '3ans') {
        this.activeTab = tab;
    }
}
