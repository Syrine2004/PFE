import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-colleges-formations',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './colleges-formations.component.html',
    styleUrls: ['./colleges-formations.component.scss']
})
export class CollegesFormationsComponent {
    readonly colleges = [
        {
            name: "College de Chirurgie",
            president: "Pr. Ahmed Ben Salah",
            specialites: ["Chirurgie generale", "Chirurgie cardiovasculaire", "Neurochirurgie", "Chirurgie pediatrique"],
            stages: ["CHU Charles Nicolle", "CHU La Rabta", "Hopital Militaire"],
        },
        {
            name: "College de Medecine",
            president: "Pr. Fatma Kammoun",
            specialites: ["Medecine interne", "Cardiologie", "Pneumologie", "Nephrologie"],
            stages: ["CHU Mongi Slim", "CHU Hedi Chaker", "CHU Farhat Hached"],
        },
        {
            name: "College de Pediatrie",
            president: "Pr. Mohamed Habib Sfar",
            specialites: ["Pediatrie", "Neonatologie", "Chirurgie pediatrique"],
            stages: ["Hopital d'enfants", "CHU Monastir", "CHU Sfax"],
        },
        {
            name: "College de Gynecologie",
            president: "Pr. Leila Ayadi",
            specialites: ["Gynecologie-Obstetrique", "Medecine de la reproduction"],
            stages: ["Centre de maternite", "CHU La Rabta", "CHU Sousse"],
        },
        {
            name: "College de Radiologie",
            president: "Pr. Nabil Dridi",
            specialites: ["Radiologie diagnostique", "Radiologie interventionnelle"],
            stages: ["CHU Charles Nicolle", "CHU Habib Bourguiba"],
        },
        {
            name: "College de Psychiatrie",
            president: "Pr. Rim Ben Amor",
            specialites: ["Psychiatrie adulte", "Pedopsychiatrie"],
            stages: ["Hopital Razi", "CHU Monastir", "CHU Sfax"],
        },
    ];
}
