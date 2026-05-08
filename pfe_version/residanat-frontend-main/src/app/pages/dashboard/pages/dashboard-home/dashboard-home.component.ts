import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import { DossierService, DossierCandidature } from '../../../../core/services/dossier.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService, Notification } from '../../../../core/services/notification.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResultatsService, ResultatDto } from '../../../../core/services/resultats.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  private concoursService = inject(ConcoursService);
  private dossierService = inject(DossierService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private translate = inject(TranslateService);
  private langChangeSub?: Subscription;

  private router = inject(Router);
  publiesConcours: Concours[] = [];
  private resultatsService = inject(ResultatsService);
  userName: string = '';
  hasDossier: boolean = false;
  dossier: DossierCandidature | null = null;
  resultat: ResultatDto | null = null;
  candidatId: number | null = null;
  
  // Nouveau : gestion par concours
  dossiersByConcours: Map<string, DossierCandidature | null> = new Map();
  selectedConcoursId: string | null = null;

  notifications: Notification[] = [];
  unreadCount: number = 0;

  stats: any[] = [];
  progressionSteps: any[] = [];
  initLabels() {
    this.stats = [
      { type: 'dossier', label: this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.LABEL'), value: this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.VAL_NOT_STARTED'), icon: 'clock', badge: this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.BADGE_TO_COMPLETE'), status: 'pending', theme: '' },
      { type: 'score', label: this.translate.instant('DASHBOARD_HOME.STATS.SCORE.LABEL'), value: '-', icon: 'scan-line', subLabel: this.translate.instant('DASHBOARD_HOME.STATS.SCORE.SUBLABEL_OCR'), progress: 0 },
      { type: 'convocation', label: this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.LABEL'), value: this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.VAL_NOT_GEN'), icon: 'file-text', badge: this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.BADGE_AFTER_ADMIN'), status: 'pending' },
      { type: 'resultats', label: this.translate.instant('DASHBOARD_HOME.STATS.RESULTATS.LABEL'), value: this.translate.instant('DASHBOARD_HOME.STATS.RESULTATS.VAL_NOT_PUB'), icon: 'bar-chart-3', badge: this.translate.instant('DASHBOARD_HOME.STATS.RESULTATS.BADGE_AFTER_EXAM'), status: 'pending' },
    ];

    this.progressionSteps = [
      { label: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_1.LABEL'), status: 'current', progress: 0, note: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_1.NOTE_TO_COMPLETE') },
      { label: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_2.LABEL'), status: 'pending', progress: 0, note: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_2.NOTE_PENDING') },
      { label: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_3.LABEL'), status: 'pending', progress: 0, note: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_3.NOTE_PENDING') },
      { label: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.LABEL'), status: 'pending', progress: 0, note: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.NOTE_PENDING') },
      { label: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_5.LABEL'), status: 'pending', progress: 0, note: this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_5.NOTE_PENDING') },
    ];
  }

  isNotificationsOpen = false;

  toggleNotifications() {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    if (this.isNotificationsOpen && this.unreadCount > 0) {
      this.markAllAsRead();
    }
  }

  private loadNotifications(candidatId: number, concoursId?: string) {
    this.notificationService.getNotifications(candidatId, concoursId).subscribe({
      next: (notifs) => {
        this.notifications = notifs;
      },
      error: (err) => console.error('Erreur notifications', err)
    });

    this.notificationService.getUnreadCount(candidatId, concoursId).subscribe({
      next: (count) => {
        this.unreadCount = count;
      },
      error: (err) => console.error('Erreur count', err)
    });
  }

  markAllAsRead() {
    const candidatId = this.getCandidatId();
    const concoursId = this.selectedConcoursId || undefined;
    if (candidatId) {
      this.notificationService.markAllAsRead(Number(candidatId), concoursId).subscribe({
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

    if (message.includes('résultat') || message.includes('resultat') || message.includes('relevé')) {
      return ['/dashboard/resultats-candidat'];
    }

    if (notif.type === 'ERROR' || message.includes('rejet') || message.includes('refaire l\'inscription')) {
      return ['/dashboard/creer-dossier'];
    }

    if (message.includes('réclamation') || message.includes('reclamation')) {
      return ['/dashboard/reclamation'];
    }

    return ['/dashboard'];
  }

  isConcoursClosed(dateFin?: string): boolean {
    if (!dateFin) return false;
    return new Date() > new Date(dateFin);
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


  ngOnInit() {
    this.initLabels();
    
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.initLabels();
      if (this.dossier) {
        this.updateStatsFromDossier(this.dossier);
      }
    });

    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.userName = `${profile.prenom || ''} ${profile.nom || ''}`.trim() || 'Utilisateur';
          this.candidatId = profile.id;
          this.fetchDashboardData(profile.id);
          // fetchDashboardData calls selectConcours which calls loadNotifications
          // Retiré: loadResultats est maintenant géré via updateStatsFromDossier pour avoir le bon concoursId
        }
      },
      error: (err) => {
        console.error('Erreur profil', err);
        this.userName = 'Utilisateur';
        this.fetchDashboardData();
      }
    });
  }

  ngOnDestroy() {
    if (this.langChangeSub) {
      this.langChangeSub.unsubscribe();
    }
  }

  private loadResultats(candidatId: number, concoursId?: string) {
    const resultsStatIndex = this.stats.findIndex(s => s.type === 'resultats');
    if (resultsStatIndex === -1) return;

    // Sécurité : ne jamais appeler si le candidat est non éligible
    if (this.progressionSteps[3].status === 'blocked') return;

    // SNAPSHOT GUARD : capture l'ID du concours au moment de l'appel
    const snapshotConcoursId = this.selectedConcoursId;

    // 1. Détermination du concours à vérifier
    const getTargetConcoursId = (): Observable<string | undefined> => {
      if (concoursId) return new Observable(s => { s.next(concoursId); s.complete(); });
      if (this.publiesConcours.length > 0) {
        return new Observable(s => { s.next(this.publiesConcours[0].id); s.complete(); });
      }
      return this.concoursService.getConcours(0, 1).pipe(
        map(res => res.content[0]?.id)
      );
    };

    getTargetConcoursId().subscribe({
      next: (targetId) => {
        // GUARD: si l'utilisateur a changé de concours entre temps, ignorer
        if (this.selectedConcoursId !== snapshotConcoursId) return;
        if (!targetId) return;

        this.resultatsService.isPublie(targetId).subscribe({
          next: (isGlobalPublie) => {
            // GUARD: vérification après chaque appel async
            if (this.selectedConcoursId !== snapshotConcoursId) return;

            const currentConcours = this.publiesConcours.find(c => c.id === targetId);
            const isReallyPublie = isGlobalPublie || currentConcours?.etat === 'RESULTATS_PUBLIES';

            if (isReallyPublie) {
              this.stats[resultsStatIndex].value = this.translate.instant('DASHBOARD_HOME.STATS.RESULTATS.VAL_PUBLISHED');
              this.stats[resultsStatIndex].badge = this.translate.instant('DASHBOARD_HOME.STATS.RESULTATS.BADGE_OFFICIAL');
              this.stats[resultsStatIndex].icon = 'check-circle';
              this.stats[resultsStatIndex].status = 'pending';
            }

            const resultObservable = targetId
              ? this.resultatsService.getResultatByConcours(candidatId, targetId)
              : this.resultatsService.getMesResultats(candidatId);

            resultObservable.subscribe({
              next: (res) => {
                // GUARD: ignorer si concours a changé
                if (this.selectedConcoursId !== snapshotConcoursId) return;
                if (res) {
                  this.resultat = res;
                  this.updateResultsCard(res);
                  this.updateResultsStepAsDone(res);
                }
              },
              error: (err) => {
                if (this.selectedConcoursId !== snapshotConcoursId) return;
                if (err?.status === 400 || err?.status === 404) return;
                if (isReallyPublie) {
                  this.progressionSteps[4].status = 'done';
                  this.progressionSteps[4].progress = 100;
                  this.progressionSteps[4].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_5.NOTE_CLOSED');
                }
              }
            });
          }
        });
      }
    });
  }


  private updateResultsCard(res: ResultatDto) {
    const resultsStatIndex = this.stats.findIndex(s => s.type === 'resultats');
    if (resultsStatIndex === -1) return;

    const statusStr = (res.statut || '').toLowerCase();
    const isAdmis = statusStr.includes('admis') || statusStr.includes('admit');
    
    let translatedStatus = res.statut?.toUpperCase();
    if (isAdmis) {
      translatedStatus = this.translate.instant('RESULTATS.STATUS.ADMIS').toUpperCase();
    } else if (statusStr.includes('refus')) {
      translatedStatus = this.translate.instant('RESULTATS.STATUS.REFUSE').toUpperCase();
    }

    this.stats[resultsStatIndex].value = translatedStatus || this.translate.instant('DASHBOARD_HOME.STATS.RESULTATS.VAL_PUBLISHED');
    this.stats[resultsStatIndex].badge = null;
    // On met success ou error pour afficher le bouton de téléchargement dans le HTML
    this.stats[resultsStatIndex].status = (isAdmis || statusStr.includes('refus')) ? 'success' : 'error';
    this.stats[resultsStatIndex].icon = isAdmis ? 'check-circle' : 'x-circle';
    this.stats[resultsStatIndex].theme = isAdmis ? 'valide' : 'rejete';
  }

  private updateResultsStepAsDone(res: ResultatDto) {
    const isAdmis = res.statut?.toLowerCase().includes('admis');
    this.progressionSteps[4].status = 'done';
    this.progressionSteps[4].progress = 100;
    this.progressionSteps[4].note = isAdmis
      ? this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_5.NOTE_ADMITTED')
      : this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_5.NOTE_NOT_ADMITTED');
  }

  downloadResultat(event?: Event) {
    if (event) event.stopPropagation();
    if (!this.candidatId) return;
    this.resultatsService.telechargerResultatPdf(this.candidatId, this.selectedConcoursId || undefined).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `releve_notes_${this.userName.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Erreur téléchargement résultats', err)
    });
  }

  fetchDashboardData(candidatId?: number) {
    this.concoursService.getConcours(0, 10).subscribe({
      next: (response) => {
        this.publiesConcours = response.content.filter(c => c.etat !== 'NON_PUBLIE');
        
        if (candidatId && this.publiesConcours.length > 0) {
          // Tentative d'auto-détection du concours pertinent (celui où le candidat a un dossier)
          let foundRelevant = false;
          let processedCount = 0;

          this.publiesConcours.forEach(concours => {
            this.dossierService.getDossierByCandidat(candidatId, concours.id).subscribe({
              next: (dossier) => {
                processedCount++;
                if (dossier && !foundRelevant) {
                  foundRelevant = true;
                  this.selectConcours(concours.id);
                }
                
                // Fallback: si aucun dossier trouvé après avoir tout vérifié, prendre le premier par défaut
                if (processedCount === this.publiesConcours.length && !foundRelevant) {
                  this.selectConcours(this.publiesConcours[0].id);
                }
              },
              error: () => {
                processedCount++;
                if (processedCount === this.publiesConcours.length && !foundRelevant) {
                  this.selectConcours(this.publiesConcours[0].id);
                }
              }
            });
          });
        }
      },
      error: (err) => console.error('Erreur concours', err)
    });
  }

  private loadDossierForConcours(candidatId: number, concoursId: string) {
    this.loadDossierFresh(candidatId, concoursId);
  }

  /** Toujours charger depuis le backend (pas de cache) */
  private loadDossierFresh(candidatId: number, concoursId: string) {
    const snapshotConcoursId = concoursId; // le concours qu'on est en train de charger
    this.dossierService.getDossierByCandidat(candidatId, concoursId).subscribe({
      next: (dossier) => {
        // Ignorer si l'utilisateur a déjà changé de concours
        if (this.selectedConcoursId !== snapshotConcoursId) return;

        this.dossiersByConcours.set(concoursId, dossier || null);
        this.dossier = dossier || null;
        this.hasDossier = !!dossier;

        if (dossier) {
          this.updateStatsFromDossier(dossier);
        } else {
          this.initLabels();
        }
      },
      error: () => {
        if (this.selectedConcoursId !== snapshotConcoursId) return;
        this.dossiersByConcours.set(concoursId, null);
        this.dossier = null;
        this.hasDossier = false;
        this.initLabels();
      }
    });
  }

  hasDossierFor(concoursId: string): boolean {
    return !!this.dossiersByConcours.get(concoursId);
  }

  getDossierIdFor(concoursId: string): string | number {
    const d = this.dossiersByConcours.get(concoursId);
    return d ? d.id : '';
  }

  canModifyDossier(concoursId?: string): boolean {
    const d = concoursId ? this.dossiersByConcours.get(concoursId) : this.dossier;
    return d?.statut === 'EN_ATTENTE' || d?.statut === 'REJETE';
  }

  selectConcours(concoursId: string) {
    if (this.selectedConcoursId === concoursId) return; // déjà sélectionné

    this.selectedConcoursId = concoursId;
    this.concoursService.setSelectedConcoursId(concoursId);

    // 1. Reset IMMÉDIAT de toutes les données
    this.dossier = null;
    this.hasDossier = false;
    this.resultat = null;
    this.initLabels();

    // 2. Recharger TOUJOURS depuis le backend (jamais depuis le cache)
    if (this.candidatId) {
      this.loadDossierFresh(this.candidatId, concoursId);
      this.loadNotifications(this.candidatId, concoursId);
    }

    // 3. Faire défiler vers les stats
    const statsElem = document.querySelector('.stats-grid');
    if (statsElem) statsElem.scrollIntoView({ behavior: 'smooth' });
  }

  goToDossier() {
    if (this.candidatId && this.selectedConcoursId) {
      this.router.navigate(['/dashboard/dossier', this.candidatId], { 
        queryParams: { concoursId: this.selectedConcoursId } 
      });
    }
  }

  // loadDossierStats n'est plus directement utilisé par fetchDashboardData
  loadDossierStats(concoursId: string, candidatId?: number) {
    if (candidatId) {
      this.executeLoadDossier(candidatId, concoursId);
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
      this.stats[0].badge = this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.BADGE_COMPLETE');
      this.stats[0].icon = 'check-circle';
      this.stats[0].theme = 'valide';
    } else if (dossier.statut === 'EN_ATTENTE') {
      this.stats[0].badge = this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.BADGE_EXAM');
      this.stats[0].icon = 'clock';
      this.stats[0].theme = 'attente';
    } else if (dossier.statut === 'REJETE') {
      this.stats[0].badge = this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.BADGE_REFUSED');
      this.stats[0].icon = 'x-circle';
      this.stats[0].theme = 'rejete';
    } else {
      this.stats[0].badge = this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.BADGE_TO_COMPLETE');
      this.stats[0].icon = 'clock';
      this.stats[0].theme = '';
    }

    // 2. Étape 0 : Inscription au concours
    const docCount = dossier.documents ? dossier.documents.length : 0;
    const minDocs = 3; // CIN, DIPLOME, PHOTO
    if (docCount >= minDocs) {
      this.progressionSteps[0].status = 'done';
      this.progressionSteps[0].progress = 100;
      this.progressionSteps[0].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_1.NOTE_SUCCESS');
    } else {
      this.progressionSteps[0].status = 'current';
      this.progressionSteps[0].progress = Math.round((docCount / minDocs) * 100);
      this.progressionSteps[0].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_1.NOTE_DOCS', { count: docCount, total: minDocs });
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
        details = this.translate.instant('DASHBOARD_HOME.STATS.SCORE.ID_DIP', { id: scoreId, dip: scoreDip });
      } else if (scoreId !== null) {
        details = this.translate.instant('DASHBOARD_HOME.STATS.SCORE.ID_ONLY', { id: scoreId });
      } else if (scoreDip !== null) {
        details = this.translate.instant('DASHBOARD_HOME.STATS.SCORE.DIP_ONLY', { dip: scoreDip });
      }
      this.stats[1].subLabel = details;

      if (hasGlobalScore) {
        this.progressionSteps[1].status = 'done';
        this.progressionSteps[1].progress = 100;
        this.progressionSteps[1].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_2.NOTE_DONE', { score: scoreGlobal, details: details });
      } else {
        this.progressionSteps[1].status = 'current';
        this.progressionSteps[1].progress = 50;
        this.progressionSteps[1].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_2.NOTE_PROGRESS');
      }
    } else if (this.progressionSteps[0].status === 'done') {
      this.progressionSteps[1].status = 'current';
      this.progressionSteps[1].progress = 50;
      this.progressionSteps[1].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_2.NOTE_PROGRESS');
    }

    // 4. Étape 2 : Validation administrative
    if (dossier.statut === 'VALIDE') {
      this.progressionSteps[2].status = 'done';
      this.progressionSteps[2].progress = 100;
      this.progressionSteps[2].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_3.NOTE_DONE');
    } else if (dossier.statut === 'REJETE') {
      this.progressionSteps[2].status = 'pending';
      this.progressionSteps[2].progress = 0;
      this.progressionSteps[2].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_3.NOTE_REJECTED');
    } else if (this.progressionSteps[1].status === 'done' || (dossier.statut === 'EN_ATTENTE' && this.progressionSteps[0].status === 'done')) {
      this.progressionSteps[2].status = 'current';
      this.progressionSteps[2].progress = 50;
      this.progressionSteps[1].status = 'done'; // Ensure IA step is done if we are at admin stage
      this.progressionSteps[2].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_3.NOTE_MODIFIABLE');
    }

    // 5. Étape 3 : Convocation (vérification réelle côté API)
    if (dossier.statut === 'VALIDE' && dossier.id) {
      this.progressionSteps[3].status = 'current';
      this.progressionSteps[3].progress = 40;
      this.progressionSteps[3].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.NOTE_ELIGIBILITY');

      this.stats[2].value = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.VAL_CHECK');
      this.stats[2].badge = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.BADGE_CHECKING');
      this.stats[2].status = 'pending';
      this.stats[2].icon = 'clock';
      this.stats[2].theme = 'attente';

      // Logic to not overwrite if results are already published
      if (this.progressionSteps[4].status !== 'done') {
        this.progressionSteps[4].status = 'pending';
        this.progressionSteps[4].progress = 0;
      }

      this.refreshConvocationState(Number(dossier.id));
      // loadResultats sera appelé par refreshConvocationState si convocation disponible (200 OK)
    } else {
      this.stats[2].value = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.VAL_NOT_GEN');
      this.stats[2].badge = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.BADGE_AFTER_ADMIN');
      this.stats[2].status = 'pending';
      this.stats[2].icon = 'file-text';
      this.stats[2].theme = '';
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

    if (diffInSeconds < 60) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.JUST_NOW');
    if (diffInSeconds < 3600) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.MIN_AGO', { min: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.HOURS_AGO', { hours: Math.floor(diffInSeconds / 3600) });
    return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.DAYS_AGO', { days: Math.floor(diffInSeconds / 86400) });
  }

  getTranslatedNotification(msg: string): string {
    if (!msg) return '';
    const lower = msg.toLowerCase();
    
    if (lower.includes('validé')) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.MSG.DOSSIER_VALIDATED');
    if (lower.includes('rejeté') || lower.includes('refaire')) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.MSG.DOSSIER_REJECTED');
    if (lower.includes('convocation')) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.MSG.CONVOCATION_READY');
    if (lower.includes('résultat') || lower.includes('resultat') || lower.includes('relevé')) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.MSG.RESULTATS_READY');
    if (lower.includes('réclamation') || lower.includes('reclamation')) {
      if (lower.includes('acceptée') || lower.includes('acceptee')) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.MSG.RECLAMATION_ACCEPTED');
      if (lower.includes('rejetée') || lower.includes('rejetee')) return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.MSG.RECLAMATION_REJECTED');
      return this.translate.instant('DASHBOARD_HOME.NOTIFICATIONS.MSG.RECLAMATION_REPLY');
    }
    
    return msg;
  }

  getFriendlyStatus(statut: string): string {
    const mapping: any = {
      'EN_ATTENTE': this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.VAL_PENDING'),
      'VALIDE': this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.VAL_VALIDATED'),
      'REJETE': this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.VAL_REJECTED'),
      'INCOMPLET': this.translate.instant('DASHBOARD_HOME.STATS.DOSSIER.VAL_INCOMPLETE')
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
      case 'done': return this.translate.instant('DASHBOARD_HOME.PROGRESS.BADGE.DONE');
      case 'current': return this.translate.instant('DASHBOARD_HOME.PROGRESS.BADGE.CURRENT');
      case 'blocked': return this.translate.instant('DASHBOARD_HOME.PROGRESS.BADGE.BLOCKED');
      default: return this.translate.instant('DASHBOARD_HOME.PROGRESS.BADGE.PENDING');
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
    // SNAPSHOT GUARD : capturer le concours sélectionné au moment de l'appel
    const snapshotConcoursId = this.selectedConcoursId;

    this.dossierService.getConvocationInfo(dossierId).subscribe({
      next: (response) => {
        // Si l'utilisateur a changé de concours pendant la requête → ignorer
        if (this.selectedConcoursId !== snapshotConcoursId) return;

        const convocation = response.body;
        const listStatus = response.headers.get('X-List-Status');

        if (listStatus === 'PENDING') {
          // Cas où la liste n'est pas encore publiée (même si la convocation existe côté API)
          this.progressionSteps[3].status = 'current';
          this.progressionSteps[3].progress = 60;
          this.progressionSteps[3].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.NOTE_WAITING_LIST');

          this.stats[2].value = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.VAL_ASSIGNING');
          this.stats[2].badge = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.BADGE_WAITING_LIST');
          this.stats[2].status = 'pending';
          this.stats[2].icon = 'clock';
          this.stats[2].theme = 'attente';
        } else if (convocation) {
          this.progressionSteps[3].status = 'done';
          this.progressionSteps[3].progress = 100;
          this.progressionSteps[3].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.NOTE_AVAILABLE');

          this.stats[2].value = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.VAL_AVAILABLE');
          this.stats[2].badge = null;
          this.stats[2].status = 'success';
          this.stats[2].icon = 'file-text';
          this.stats[2].theme = '';

          if (this.candidatId && this.dossier?.concoursId) {
            this.loadResultats(this.candidatId, this.dossier.concoursId);
          }
        } else {
          // Convocation non encore générée mais liste publiée
          this.progressionSteps[3].status = 'current';
          this.progressionSteps[3].progress = 60;
          this.progressionSteps[3].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.NOTE_WAITING_CONVOCATION');
        }
      },
      error: (err) => {
        // GUARD: ignorer si concours a changé pendant la requête
        if (this.selectedConcoursId !== snapshotConcoursId) return;

        // Garder le fallback pour les erreurs 404 (si jamais le cache ou Gateway)
        if (err?.status === 404 && err.headers?.get('X-List-Status') === 'PENDING') {
          this.progressionSteps[3].status = 'current';
          this.progressionSteps[3].progress = 60;
          this.progressionSteps[3].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.NOTE_WAITING_LIST');

          this.stats[2].value = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.VAL_ASSIGNING');
          this.stats[2].badge = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.BADGE_WAITING_LIST');
          this.stats[2].status = 'pending';
          this.stats[2].icon = 'clock';
          this.stats[2].theme = 'attente';
          return;
        }

        // 2. Candidat non éligible (403 = non présent dans la liste du Ministère)
        if (err?.status === 403) {
          this.progressionSteps[3].status = 'blocked';
          this.progressionSteps[3].progress = 0;
          this.progressionSteps[3].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.NOTE_NOT_ELIGIBLE');

          this.stats[2].value = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.VAL_NOT_ELIGIBLE');
          this.stats[2].badge = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.BADGE_DENIED');
          this.stats[2].status = 'error';
          this.stats[2].icon = 'x-circle';
          this.stats[2].theme = 'rejete';

          // Étape résultats reste À venir (ne pas appeler getMesResultats)
          this.progressionSteps[4].status = 'pending';
          this.progressionSteps[4].progress = 0;
          return;
        }

        // 3. Convocation pas encore générée (404 simple ou autre erreur) → En préparation
        this.progressionSteps[3].status = 'current';
        this.progressionSteps[3].progress = 50;
        this.progressionSteps[3].note = this.translate.instant('DASHBOARD_HOME.PROGRESS.STEP_4.NOTE_GENERATING');

        this.stats[2].value = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.VAL_PREPARING');
        this.stats[2].badge = this.translate.instant('DASHBOARD_HOME.STATS.CONVOCATION.BADGE_SOON');
        this.stats[2].status = 'pending';
        this.stats[2].icon = 'clock';
        this.stats[2].theme = 'attente';

        // Résultats ne doivent pas être demandés si la convocation n'est pas encore prête
        // (loadResultats est conditionné par progressionSteps[3].status === 'done')
      }
    });
  }

  goToConvocation() {
    this.router.navigate(['/dashboard/convocation'], { 
      queryParams: { concoursId: this.selectedConcoursId } 
    });
  }

  canOpenConvocation(stat: any): boolean {
    return stat?.type === 'convocation' && (stat?.status === 'success' || stat?.status === 'error' || stat?.status === 'pending');
  }

  canOpenResultats(stat: any): boolean {
    return stat?.type === 'resultats';
  }

  goToResultats() {
    this.router.navigate(['/dashboard/resultats-candidat'], { 
      queryParams: { concoursId: this.selectedConcoursId } 
    });
  }
}
