import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import { DossierService, DossierCandidature } from '../../../../core/services/dossier.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService, Notification } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent implements OnInit {
  private concoursService = inject(ConcoursService);
  private dossierService = inject(DossierService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  private router = inject(Router);
  publiesConcours: Concours[] = [];
  userName: string = '';
  hasDossier: boolean = false;
  dossier: DossierCandidature | null = null;

  notifications: Notification[] = [];
  unreadCount: number = 0;

  stats: any[] = [
    { label: 'Statut dossier', value: 'Non commencé', icon: 'clock', badge: 'À compléter', status: 'pending', theme: '' },
    { label: 'SCORE CONFORMITE', value: '-', icon: 'scan-line', subLabel: 'Conformité OCR', progress: 0 },
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
    if (this.isNotificationsOpen && this.unreadCount > 0) {
      this.markAllAsRead();
    }
  }

  private loadNotifications(candidatId: number) {
    this.notificationService.getNotifications(candidatId).subscribe({
      next: (notifs) => {
        this.notifications = notifs;
      },
      error: (err) => console.error('Erreur notifications', err)
    });

    this.notificationService.getUnreadCount(candidatId).subscribe({
      next: (count) => {
        this.unreadCount = count;
      },
      error: (err) => console.error('Erreur count', err)
    });
  }

  markAllAsRead() {
    const candidatId = this.getCandidatId();
    if (candidatId) {
      this.notificationService.markAllAsRead(Number(candidatId)).subscribe({
        next: () => {
          this.unreadCount = 0;
          this.notifications.forEach(n => n.read = true);
        }
      });
    }
  }

  onNotificationClick(notif: Notification) {
    if (!notif) return;

    if (!notif.read && notif.id > 0) {
      this.notificationService.markAsRead(notif.id).subscribe({
        next: () => {
          notif.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        },
        error: () => {
          notif.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      });
    }

    this.isNotificationsOpen = false;
    this.router.navigate(this.getNotificationRoute(notif));
  }

  private getNotificationRoute(notif: Notification): string[] {
    const message = (notif.message || '').toLowerCase();

    if (message.includes('convocation')) {
      return ['/dashboard/convocation'];
    }

    if (notif.type === 'ERROR' || message.includes('rejet') || message.includes('refaire l\'inscription')) {
      return ['/dashboard/creer-dossier'];
    }

    return ['/dashboard'];
  }

  getCandidatId() {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  canModifyDossier(): boolean {
    return this.dossier?.statut === 'EN_ATTENTE' || this.dossier?.statut === 'REJETE';
  }

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.userName = `${profile.prenom || ''} ${profile.nom || ''}`.trim() || 'Utilisateur';
          this.fetchDashboardData(profile.id);
          this.loadNotifications(profile.id);
        }
      },
      error: (err) => {
        console.error('Erreur profil', err);
        this.userName = 'Utilisateur';
        this.fetchDashboardData();
      }
    });
  }

  fetchDashboardData(candidatId?: number) {
    this.concoursService.getConcours(0, 100, undefined, undefined, 'PUBLIE').subscribe({
      next: (response) => {
        this.publiesConcours = response.content;
        if (this.publiesConcours.length > 0 && this.publiesConcours[0].id) {
          this.loadDossierStats(this.publiesConcours[0].id!, candidatId);
        }
      },
      error: (err) => console.error('Erreur concours', err)
    });
  }


  loadDossierStats(concoursId: string, candidatId?: number) {
    if (candidatId) {
      this.executeLoadDossier(candidatId, concoursId);
    } else {
      this.authService.getProfile().subscribe({
        next: (profile: any) => {
          if (profile && profile.id) {
            this.executeLoadDossier(profile.id, concoursId);
          }
        },
        error: (err: any) => console.error('Erreur profil', err)
      });
    }
  }

  private executeLoadDossier(candidatId: number, concoursId: string) {
    this.dossierService.getDossierByCandidat(candidatId, concoursId).subscribe({
      next: (dossier) => {
        if (dossier) {
          this.hasDossier = true;
          this.dossier = dossier;
          this.updateStatsFromDossier(dossier);
        } else {
          this.hasDossier = false;
        }
      },
      error: (err) => {
        console.error('Erreur dossier', err);
        this.hasDossier = false;
      }
    });
  }

  updateStatsFromDossier(dossier: DossierCandidature) {
    // 1. Mise à jour du statut dossier dans les stats
    this.stats[0].value = this.getFriendlyStatus(dossier.statut);

    if (dossier.statut === 'VALIDE') {
      this.stats[0].badge = 'Dossier complet';
      this.stats[0].icon = 'check-circle';
      this.stats[0].theme = 'valide';
    } else if (dossier.statut === 'EN_ATTENTE') {
      this.stats[0].badge = 'En cours d\'examen';
      this.stats[0].icon = 'clock';
      this.stats[0].theme = 'attente';
    } else if (dossier.statut === 'REJETE') {
      this.stats[0].badge = 'Dossier refusé';
      this.stats[0].icon = 'x-circle';
      this.stats[0].theme = 'rejete';
    } else {
      this.stats[0].badge = 'À compléter';
      this.stats[0].icon = 'clock';
      this.stats[0].theme = '';
    }

    // 2. Étape 0 : Inscription au concours
    const docCount = dossier.documents ? dossier.documents.length : 0;
    const minDocs = 3; // CIN, DIPLOME, PHOTO
    if (docCount >= minDocs) {
      this.progressionSteps[0].status = 'done';
      this.progressionSteps[0].progress = 100;
      this.progressionSteps[0].note = 'Dossier soumis avec succès';
    } else {
      this.progressionSteps[0].status = 'current';
      this.progressionSteps[0].progress = Math.round((docCount / minDocs) * 100);
      this.progressionSteps[0].note = `${docCount}/${minDocs} documents téléchargés`;
    }

    // 3. Étape 1 : Vérification IA
    if (dossier.evaluationIA) {
      const scoreId = dossier.evaluationIA.scoreCin !== null && dossier.evaluationIA.scoreCin !== undefined
        ? Math.round(dossier.evaluationIA.scoreCin)
        : null;
      const scoreDip = dossier.evaluationIA.scoreDiplome !== null && dossier.evaluationIA.scoreDiplome !== undefined
        ? Math.round(dossier.evaluationIA.scoreDiplome)
        : null;
      const globalScore = dossier.evaluationIA.score;
      const hasGlobalScore = globalScore !== null && globalScore !== undefined;
      const scoreGlobal = hasGlobalScore ? Math.round(globalScore) : 0;

      this.stats[1].value = hasGlobalScore ? `${scoreGlobal}%` : '-';
      this.stats[1].progress = hasGlobalScore ? scoreGlobal : 0;

      let details = '';
      if (scoreId !== null && scoreDip !== null) {
        details = `Identité: ${scoreId}% | Diplôme: ${scoreDip}%`;
      } else if (scoreId !== null) {
        details = `Identité: ${scoreId}%`;
      } else if (scoreDip !== null) {
        details = `Diplôme: ${scoreDip}%`;
      }
      this.stats[1].subLabel = details;

      if (hasGlobalScore) {
        this.progressionSteps[1].status = 'done';
        this.progressionSteps[1].progress = 100;
        this.progressionSteps[1].note = `Score IA : ${scoreGlobal}% (${details})`;
      } else {
        this.progressionSteps[1].status = 'current';
        this.progressionSteps[1].progress = 50;
        this.progressionSteps[1].note = 'Analyse IA en cours...';
      }
    } else if (this.progressionSteps[0].status === 'done') {
      this.progressionSteps[1].status = 'current';
      this.progressionSteps[1].progress = 50;
      this.progressionSteps[1].note = 'Analyse IA en cours...';
    }

    // 4. Étape 2 : Validation administrative
    if (dossier.statut === 'VALIDE') {
      this.progressionSteps[2].status = 'done';
      this.progressionSteps[2].progress = 100;
      this.progressionSteps[2].note = 'Dossier validé par l\'administration';
    } else if (dossier.statut === 'REJETE') {
      this.progressionSteps[2].status = 'pending';
      this.progressionSteps[2].progress = 0;
      this.progressionSteps[2].note = 'Dossier rejeté — Veuillez consulter vos emails';
    } else if (this.progressionSteps[1].status === 'done' || dossier.statut === 'EN_ATTENTE') {
      this.progressionSteps[2].status = 'current';
      this.progressionSteps[2].progress = 50;
      this.progressionSteps[1].status = 'done'; // Ensure IA step is done if we are at admin stage
      this.progressionSteps[2].note = 'Dossier modifiable (en attente de validation administrative)';
    }

    // 5. Étape 3 : Convocation (vérification réelle côté API)
    if (dossier.statut === 'VALIDE' && dossier.id) {
      this.progressionSteps[3].status = 'current';
      this.progressionSteps[3].progress = 40;
      this.progressionSteps[3].note = 'Vérification d\'éligibilité en cours...';

      this.stats[2].value = 'Vérification...';
      this.stats[2].badge = 'Contrôle en cours';
      this.stats[2].status = 'pending';
      this.stats[2].icon = 'clock';
      this.stats[2].theme = 'attente';

      this.progressionSteps[4].status = 'pending';
      this.progressionSteps[4].progress = 0;

      this.refreshConvocationState(Number(dossier.id));
    } else {
      this.stats[2].value = 'Non générée';
      this.stats[2].badge = 'Après validation admin';
      this.stats[2].status = 'pending';
      this.stats[2].icon = 'file-text';
      this.stats[2].theme = '';
    }

    // 6. Mise à jour de la date du concours si dispo
    if (this.publiesConcours.length > 0 && this.publiesConcours[0].dateDebut) {
      const dateC = new Date(this.publiesConcours[0].dateDebut);
      this.progressionSteps[4].note = dateC.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

  }

  private parseNotificationDate(dateInput: Date | string): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }

    const raw = (dateInput || '').trim();
    if (!raw) {
      return new Date();
    }

    // Backend sends LocalDateTime without offset; anchor it to Tunis time to avoid drift.
    const hasOffset = /([zZ]|[+-]\d{2}:\d{2})$/.test(raw);
    const normalized = hasOffset ? raw : `${raw}+01:00`;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    const fallback = new Date(raw.replace(' ', 'T'));
    return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  formatRelativeTime(dateInput: Date | string): string {
    const date = this.parseNotificationDate(dateInput);
    const diffInSeconds = Math.max(0, Math.floor((new Date().getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) return 'À l’instant';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
    return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
  }

  getFriendlyStatus(statut: string): string {
    const mapping: any = {
      'EN_ATTENTE': 'En attente',
      'VALIDE': 'Validé',
      'REJETE': 'Rejeté',
      'INCOMPLET': 'Incomplet'
    };
    return mapping[statut] || statut;
  }

  getJourneyProgress(): number {
    const doneCount = this.progressionSteps.filter(s => s.status === 'done').length;
    const currentStep = this.progressionSteps.find(s => s.status === 'current');
    const currentProgress = currentStep ? (currentStep.progress / 100) : 0;

    // Calculate total height: (Number of completed steps + progress of current step) / (Total steps - 1)
    // We substract 1 because the line connects centers of first and last items.
    const totalSteps = this.progressionSteps.length;
    const progress = ((doneCount + currentProgress) / (totalSteps - 1)) * 100;

    return Math.min(100, progress);
  }

  getStepBadgeClass(status: string): string {
    switch (status) {
      case 'done': return 'badge-done';
      case 'current': return 'badge-current';
      case 'blocked': return 'badge-blocked';
      default: return 'badge-pending';
    }
  }

  getStepBadgeLabel(status: string): string {
    switch (status) {
      case 'done': return 'Terminé';
      case 'current': return 'En cours';
      case 'blocked': return 'Bloqué';
      default: return 'À venir';
    }
  }

  downloadConvocation(event?: Event) {
    if (event) event.stopPropagation();
    if (!this.dossier || !this.dossier.id) {
      console.warn('Dossier non trouvé pour le téléchargement');
      return;
    }

    this.dossierService.telechargerConvocationPdf(Number(this.dossier.id)).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convocation_${this.userName.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Erreur téléchargement', err)
    });
  }

  private refreshConvocationState(dossierId: number): void {
    this.dossierService.getConvocationInfo(dossierId).subscribe({
      next: (convocation) => {
        if (convocation) {
          this.progressionSteps[3].status = 'done';
          this.progressionSteps[3].progress = 100;
          this.progressionSteps[3].note = 'Disponible dans votre espace personnel';

          this.stats[2].value = 'Disponible';
          this.stats[2].badge = null;
          this.stats[2].status = 'success';
          this.stats[2].icon = 'file-text';
          this.stats[2].theme = '';

          this.progressionSteps[4].status = 'current';
          this.progressionSteps[4].progress = 10;
        }
      },
      error: (err) => {
        if (err?.status === 403) {
          this.progressionSteps[3].status = 'blocked';
          this.progressionSteps[3].progress = 0;
          this.progressionSteps[3].note = 'Processus arrêté: dossier non éligible selon la liste du Ministère.';

          this.stats[2].value = 'Non éligible';
          this.stats[2].badge = 'Accès refusé';
          this.stats[2].status = 'error';
          this.stats[2].icon = 'x-circle';
          this.stats[2].theme = 'rejete';

          this.progressionSteps[4].status = 'pending';
          this.progressionSteps[4].progress = 0;
          return;
        }

        this.progressionSteps[3].status = 'current';
        this.progressionSteps[3].progress = 50;
        this.progressionSteps[3].note = 'Convocation en préparation';

        this.stats[2].value = 'En préparation';
        this.stats[2].badge = 'Réessayez plus tard';
        this.stats[2].status = 'pending';
        this.stats[2].icon = 'clock';
        this.stats[2].theme = 'attente';
      }
    });
  }

  goToConvocation() {
    this.router.navigate(['/dashboard/convocation']);
  }

  canOpenConvocation(stat: any): boolean {
    return stat?.label === 'Convocation' && (stat?.status === 'success' || stat?.status === 'error');
  }
}
