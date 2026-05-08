import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { ResultatsService, ResultatDto } from '../../../../core/services/resultats.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConcoursService } from '../../../../core/services/concours.service';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-resultats-candidat',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('0.6s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  templateUrl: './resultats-candidat.component.html',
  styleUrl: './resultats-candidat.component.scss'
})
export class ResultatsCandidatComponent implements OnInit, OnDestroy {
  private resultatsService = inject(ResultatsService);
  private authService = inject(AuthService);
  private concoursService = inject(ConcoursService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private langChangeSub?: Subscription;
  private concoursSub?: Subscription;

  resultat: ResultatDto | null = null;
  isLoading = true;
  errorMessage = '';
  candidatId: number | null = null;
  concoursId: string | null = null;
  currentYear = new Date().getFullYear();
  isEligible = false;
  qrImageUrl: string | null = null;

  ngOnInit(): void {
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      // Logic for dynamic updates if needed
    });

    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile?.id) {
          this.candidatId = profile.id;
          
          // REFACTORED: Listen to concours changes
          this.concoursSub = this.concoursService.selectedConcoursId$.subscribe(cid => {
            this.isLoading = true;
            this.resultat = null;
            this.errorMessage = '';
            this.fetchResultats(cid);
          });
        } else {
          this.isLoading = false;
          this.errorMessage = this.translate.instant('RESULTATS.ERRORS.AUTH_FAILED');
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = this.translate.instant('RESULTATS.ERRORS.AUTH_FAILED');
      }
    });
  }

  ngOnDestroy() {
    if (this.langChangeSub) this.langChangeSub.unsubscribe();
    if (this.concoursSub) this.concoursSub.unsubscribe();
  }

  fetchResultats(forcedConcoursId: string | null = null) {
    this.isLoading = true;
    if (!this.candidatId) { this.isLoading = false; return; }

    const concoursIdFromRoute = this.route.snapshot.queryParamMap.get('concoursId');
    const concoursId = forcedConcoursId || concoursIdFromRoute;

    if (concoursId) {
      this.executeFetchResultats(this.candidatId, concoursId);
      return;
    }

    // Sinon obtenir le concours actif par défaut
    this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
      next: (concoursRes) => {
        const activeConcours = concoursRes.content[0];
        if (!activeConcours || !activeConcours.id) {
          this.isLoading = false;
          this.errorMessage = this.translate.instant('RESULTATS.ERRORS.NO_CONCOURS');
          return;
        }
        this.executeFetchResultats(this.candidatId!, activeConcours.id);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = this.translate.instant('COMMON.ERROR');
      }
    });
  }

  private executeFetchResultats(candidatId: number, concoursId: string) {
    this.concoursId = concoursId;
    const snapshotConcoursId = concoursId;

    this.resultatsService.getResultatByConcours(candidatId, concoursId).subscribe({
      next: (res) => {
        if (this.concoursId !== snapshotConcoursId) return;
        this.resultat = res;
        this.isEligible = true;
        
        if (this.resultat.hashSecurise) {
          const baseApi = window.location.hostname === 'localhost' 
            ? 'http://localhost:8080' 
            : `${window.location.protocol}//${window.location.hostname}`;
          this.qrImageUrl = `${baseApi}/api/candidat/resultats/qr/${this.resultat.hashSecurise}`;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 403) {
          this.errorMessage = this.translate.instant('RESULTATS.ERRORS.NOT_ELIGIBLE');
        } else {
          this.errorMessage = err?.error?.message || this.translate.instant('RESULTATS.ERRORS.NOT_PUBLISHED');
        }
      }
    });
  }

  isAdmis(s: string | undefined): boolean {
    return s?.toLowerCase().includes('admis') || s?.toLowerCase().includes('admit') || false;
  }

  getTranslatedStatus(status: string | undefined): string {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('admis') || s.includes('admit')) {
      return this.translate.instant('RESULTATS.STATUS.ADMIS');
    }
    if (s.includes('refus')) {
      return this.translate.instant('RESULTATS.STATUS.REFUSE');
    }
    return status;
  }

  isNotAvailableMsg(): boolean {
    const msg = this.errorMessage.toLowerCase();
    return msg.includes('publi') || msg.includes('attente') || msg.includes('trouv') || msg.includes('available');
  }

  isNonEligible(): boolean {
    return this.errorMessage.toLowerCase().includes('éligible');
  }

  imprimer() {
    window.print();
  }

  downloadPdf() {
    if (!this.candidatId) return;
    
    this.resultatsService.telechargerResultatPdf(this.candidatId, this.concoursId || undefined).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = this.resultat?.nomPrenom.replace(/\s+/g, '_') || 'candidat';
        a.download = `releve_notes_${safeName}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement PDF', err);
        this.errorMessage = this.translate.instant('RESULTATS.ERRORS.PDF_FAILED');
      }
    });
  }
}
