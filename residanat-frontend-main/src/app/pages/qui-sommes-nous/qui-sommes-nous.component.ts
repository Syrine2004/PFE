import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-qui-sommes-nous',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qui-sommes-nous.component.html',
    styleUrls: ['./qui-sommes-nous.component.scss']
})
export class QuiSommesNousComponent {
    readonly missions = [
        {
            icon: 'building',
            title: 'Ministere de la Sante',
            description:
                "Le Ministere de la Sante de la Republique Tunisienne supervise l'ensemble du processus du concours national de residanat, garantissant equite, transparence et respect des reglementations en vigueur.",
        },
        {
            icon: 'target',
            title: 'Mission du residanat',
            description:
                "Le concours de residanat a pour mission de selectionner les meilleurs candidats pour les formations specialisees en medecine, assurant ainsi la qualite des soins de sante en Tunisie.",
        },
        {
            icon: 'users',
            title: 'Colleges de specialites',
            description:
                "Chaque specialite est geree par un college responsable de la formation, de l'encadrement des residents et de l'evaluation continue tout au long du cursus.",
        },
        {
            icon: 'scale',
            title: 'Equite et transparence',
            description:
                "Le concours est organise selon des regles strictes d'equite, avec un jury national et des criteres de selection uniformes pour tous les candidats.",
        },
    ];
}
