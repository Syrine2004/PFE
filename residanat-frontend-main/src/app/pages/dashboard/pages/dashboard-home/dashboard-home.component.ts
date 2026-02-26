import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent implements OnInit {
  private concoursService = inject(ConcoursService);

  publiesConcours: Concours[] = [];

  notifications = [
    {
      message: 'Bienvenue sur Residanat TN. Veuillez débuter votre inscription.',
      time: 'À l’instant',
      type: 'info',
    },
  ];

  stats = [
    { label: 'Statut dossier', value: 'Non commencé', icon: 'clock', badge: 'À compléter', status: 'pending' },
    { label: 'Score IA', value: '-', icon: 'scan-line', subLabel: 'Conformité OCR', progress: 0 },
    { label: 'Convocation', value: 'Non générée', icon: 'file-text', badge: 'Après validation admin', status: 'pending' },
    { label: 'Résultats', value: 'Non publié', icon: 'bar-chart-3', badge: 'Après le concours', status: 'pending' },
  ];

  progressionSteps = [
    { label: 'Inscription au concours', status: 'current', progress: 0, note: 'À compléter' },
    { label: 'Vérification IA (OCR & conformité)', status: 'pending', progress: 0, note: 'Score : - — En attente' },
    { label: 'Validation administrative', status: 'pending', progress: 0, note: 'En attente' },
    { label: 'Convocation générée', status: 'pending', progress: 0, note: 'Disponible après validation' },
    { label: 'Concours', status: 'pending', progress: 0, note: '20 Avril 2026' },
    { label: 'Publication des résultats', status: 'pending', progress: 0, note: 'Après le concours' },
  ];

  isNotificationsOpen = false;

  toggleNotifications() {
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }

  ngOnInit() {
    this.fetchPublishedConcours();
  }

  fetchPublishedConcours() {
    this.concoursService.getConcours(0, 100, undefined, undefined, 'PUBLIE').subscribe({
      next: (response) => {
        this.publiesConcours = response.content;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des concours publiés', err);
      }
    });
  }
}
