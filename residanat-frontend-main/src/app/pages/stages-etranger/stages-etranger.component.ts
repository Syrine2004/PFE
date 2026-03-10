import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-stages-etranger',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './stages-etranger.component.html',
    styleUrl: './stages-etranger.component.scss'
})
export class StagesEtrangerComponent {
    conditions = [
        "Etre inscrit en annee de specialite superieure a la 2eme annee",
        "Avoir l'accord du chef de service et du directeur du CHU",
        "Disposer d'une convention avec l'etablissement d'accueil",
        "Fournir un plan de stage detaille approuve par le college",
        "Avoir un avis favorable du comite scientifique",
        "Justifier d'un financement pour la duree du stage",
    ];

    etapes = [
        {
            number: "01",
            title: "Demande initiale",
            description: "Deposer une demande aupres du college de specialite avec le dossier complet.",
        },
        {
            number: "02",
            title: "Validation college",
            description: "Le college etudie la demande et rend son avis dans un delai de 30 jours.",
        },
        {
            number: "03",
            title: "Accord ministeriel",
            description: "Le Ministere de la Sante accorde l'autorisation finale de stage a l'etranger.",
        },
        {
            number: "04",
            title: "Convention",
            description: "Signature de la convention tripartite entre le CHU, le candidat et l'etablissement d'accueil.",
        },
    ];
}
