import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { DossierService, DossierCandidature } from '../../../../core/services/dossier.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConcoursService } from '../../../../core/services/concours.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-convocation',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './convocation.component.html',
  styleUrl: './convocation.component.scss'
})
export class ConvocationComponent implements OnInit, OnDestroy {
  private dossierService = inject(DossierService);
  private authService = inject(AuthService);
  private concoursService = inject(ConcoursService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private langChangeSub?: Subscription;
  private concoursSub?: Subscription;

  dossier: DossierCandidature | null = null;
  userName: string = '';
  loading: boolean = true;
  error: string | null = null;
  listeNonPubliee: boolean = false;
  convocation: any = null;
  qrImageUrl: string = '';

  today: Date = new Date();
  userCin: string = '';
  sessionYear: number = 2026;
  private readonly convocationMaxRetries = 4;
  private readonly convocationRetryDelayMs = 1500;

  getFaculteNomComplet(lieuExamenDetail?: string): string {
    const raw = (lieuExamenDetail || '').trim();
    if (!raw) {
      return this.translate.instant('CONVOCATION.LABELS.FACULTES.NONE');
    }

    const normalized = raw.toLowerCase();

    // Keep existing full names returned by backend untouched.
    if (normalized.includes('facult')) {
      return raw;
    }

    const mapping: Record<string, string> = {
      tunis: this.translate.instant('CONVOCATION.LABELS.FACULTES.TUNIS'),
      sfax: this.translate.instant('CONVOCATION.LABELS.FACULTES.SFAX'),
      sousse: this.translate.instant('CONVOCATION.LABELS.FACULTES.SOUSSE'),
      monastir: this.translate.instant('CONVOCATION.LABELS.FACULTES.MONASTIR')
    };

    return mapping[normalized] || raw;
  }

  imprimer() {
    window.print();
  }

  ngOnInit() {
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      // Re-trigger label mapping if needed or just rely on pipe in HTML
    });

    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.userName = `${profile.prenom} ${profile.nom}`;
        this.userCin = profile.cin || 'N/A';
        
        // REAFACTORED: Listen to concours changes
        this.concoursSub = this.concoursService.selectedConcoursId$.subscribe(cid => {
          this.loading = true;
          this.convocation = null;
          this.dossier = null;
          this.listeNonPubliee = false;
          this.error = null;
          this.loadInitialData(profile.id, cid);
        });
      },
      error: (err) => {
        this.error = this.translate.instant('COMMON.ERROR');
        this.loading = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.langChangeSub) this.langChangeSub.unsubscribe();
    if (this.concoursSub) this.concoursSub.unsubscribe();
  }

  loadInitialData(candidatId: number, forcedConcoursId: string | null = null) {
    const concoursIdFromRoute = this.route.snapshot.queryParamMap.get('concoursId');
    const concoursId = forcedConcoursId || concoursIdFromRoute;

    if (concoursId) {
      this.executeLoadInitialData(candidatId, concoursId);
      return;
    }

    // Sinon obtenir le concours actif par défaut
    this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
      next: (response) => {
        const activeId = response.content?.[0]?.id;
        if (activeId) {
          this.executeLoadInitialData(candidatId, activeId);
        } else {
          this.loading = false;
        }
      },
      error: () => this.loading = false
    });
  }

  private executeLoadInitialData(candidatId: number, concoursId: string) {
    this.dossierService.getDossierByCandidat(candidatId, concoursId).subscribe({
      next: (dossier) => {
        this.dossier = dossier;
        if (dossier?.id && dossier.statut === 'VALIDE') {
          this.loadConvocationInfo(Number(dossier.id));
        } else {
          this.loading = false;
        }
      },
      error: () => this.loading = false
    });
  }

  loadConvocationInfo(dossierId: number, attempt: number = 1) {
    const timeout = setTimeout(() => {
      if (this.loading) {
        console.warn("Délai d'attente dépassé pour la convocation.");
        this.loading = false;
      }
    }, 5000);

    this.dossierService.getConvocationInfo(dossierId).subscribe({
      next: (response: any) => {
        clearTimeout(timeout);
        const info = response.body;
        const listStatus = response.headers.get('X-List-Status');

        if (listStatus === 'PENDING') {
          this.listeNonPubliee = true;
          this.loading = false;
          return;
        }

        if (!info) {
          console.warn("Convocation reçue nulle.");
          this.loading = false;
          return;
        }

        this.convocation = info;
        
        try {
          if (this.convocation.dateEpreuve && Array.isArray(this.convocation.dateEpreuve)) {
              const [year, month, day, hour, minute, second] = this.convocation.dateEpreuve;
              this.convocation.dateEpreuve = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, second || 0).toISOString();
          }
        } catch (e) {
          console.error("Erreur parsing date", e);
        }

        const baseApi = window.location.hostname === 'localhost' 
          ? 'http://localhost:8080' 
          : `${window.location.protocol}//${window.location.hostname}`;
        const cacheBuster = Date.now();
        this.qrImageUrl = `${baseApi}/api/convocations/qr/${this.convocation.hashSecurise || 'MISSING'}?v=${cacheBuster}`;

        this.loading = false;
      },
      error: (err: any) => {
        clearTimeout(timeout);
        const isTransient = [500, 502, 503, 504, 0].includes(err?.status);
        if (isTransient && attempt < this.convocationMaxRetries) {
          const nextAttempt = attempt + 1;
          setTimeout(() => this.loadConvocationInfo(dossierId, nextAttempt), this.convocationRetryDelayMs);
          return;
        }

        if (err.status === 404) {
          this.listeNonPubliee = true;
          console.info("Convocation non trouvée (404) : État mis en attente d'affectation.");
        } else if (err.status === 403) {
          this.error = this.translate.instant('CONVOCATION.STATUS.NOT_ELIGIBLE_DESC');
        } else {
          console.warn("Convocation non générée ou erreur API.", err);
        }
        this.loading = false;
      }
    });
  }

  download() {
    if (!this.dossier || !this.dossier.id) return;
    this.dossierService.telechargerConvocationPdf(Number(this.dossier.id)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convocation_${this.userName.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error('Erreur téléchargement', err)
    });
  }
}

import { Convocation } from '../../../../core/services/dossier.service';
