import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Article {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  category: string;
}

@Component({
  selector: 'app-actualites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './actualites.component.html',
  styleUrls: ['./actualites.component.scss']
})
export class ActualitesComponent {
  articles: Article[] = [
    {
      id: 1,
      title: "Ouverture des inscriptions pour le concours 2026",
      excerpt: "Les inscriptions en ligne pour le concours national de résidanat 2026 sont désormais ouvertes. Les candidats sont invités à compléter leur dossier avant la date limite.",
      date: "15 Février 2026",
      category: "Inscription",
    },
    {
      id: 2,
      title: "Nouvelle spécialité: Médecine d'urgence",
      excerpt: "Le Ministère de la Santé annonce l'ouverture d'une nouvelle spécialité de médecine d'urgence avec 20 postes disponibles pour la session 2026.",
      date: "10 Février 2026",
      category: "Nouveauté",
    },
    {
      id: 3,
      title: "Résultats du concours 2025 publiés",
      excerpt: "Les résultats définitifs du concours national de résidanat 2025 sont disponibles. Les candidats peuvent consulter leurs notes et classements.",
      date: "01 Février 2026",
      category: "Résultats",
    },
    {
      id: 4,
      title: "Mise à jour des textes réglementaires",
      excerpt: "De nouveaux arrêtés ministériels ont été publiés concernant les modalités d'organisation du concours et les conditions d'inscription.",
      date: "25 Janvier 2026",
      category: "Réglementation",
    },
    {
      id: 5,
      title: "Convention avec l'Université de Bordeaux",
      excerpt: "Signature d'une nouvelle convention de coopération pour les stages à l'étranger avec la Faculté de Médecine de Bordeaux.",
      date: "20 Janvier 2026",
      category: "International",
    },
    {
      id: 6,
      title: "Session de préparation au concours",
      excerpt: "Organisation d'une session de préparation gratuite pour les candidats au concours 2026, en partenariat avec les 4 facultés de médecine.",
      date: "15 Janvier 2026",
      category: "Formation",
    },
  ];
}
