import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-textes-reglementaires',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './textes-reglementaires.component.html',
    styleUrls: ['./textes-reglementaires.component.scss']
})
export class TextesReglementairesComponent {
    readonly arretes = [
        {
            title: "Arrete du 15 Janvier 2026",
            description: "Fixant les conditions et modalites d'organisation du concours national de residanat en medecine.",
            date: "15/01/2026",
            type: "Arrete ministeriel",
        },
        {
            title: "Arrete du 01 Fevrier 2026",
            description: "Fixant la liste des postes ouverts au concours de residanat pour l'annee universitaire 2026-2027.",
            date: "01/02/2026",
            type: "Arrete ministeriel",
        },
        {
            title: "Decret n 2025-1234",
            description: "Portant organisation des etudes medicales specialisees et du concours de residanat.",
            date: "15/12/2025",
            type: "Decret",
        },
        {
            title: "Circulaire n 2026-05",
            description: "Relative aux conditions d'inscription des candidats etrangers au concours de residanat.",
            date: "20/01/2026",
            type: "Circulaire",
        },
    ];

    readonly postesParSpecialite = [
        { specialite: "Chirurgie generale", postes: 45, faculte: "Toutes" },
        { specialite: "Medecine interne", postes: 40, faculte: "Toutes" },
        { specialite: "Pediatrie", postes: 38, faculte: "Toutes" },
        { specialite: "Gynecologie-Obstetrique", postes: 42, faculte: "Toutes" },
        { specialite: "Cardiologie", postes: 35, faculte: "Toutes" },
        { specialite: "Radiologie", postes: 30, faculte: "Toutes" },
        { specialite: "Psychiatrie", postes: 25, faculte: "Toutes" },
        { specialite: "Neurologie", postes: 25, faculte: "Toutes" },
    ];
}
