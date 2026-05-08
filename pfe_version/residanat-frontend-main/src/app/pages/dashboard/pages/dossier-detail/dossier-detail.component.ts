import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DossierService, DossierCandidature } from '../../../../core/services/dossier.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConcoursService } from '../../../../core/services/concours.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-dossier-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule],
    templateUrl: './dossier-detail.component.html',
    styleUrl: './dossier-detail.component.scss'
})
export class DossierDetailComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private dossierService = inject(DossierService);
    private concoursService = inject(ConcoursService);
    public authService = inject(AuthService);
    private translate = inject(TranslateService);
    private langChangeSub?: Subscription;
    private concoursSub?: Subscription;

    dossier: DossierCandidature | null = null;
    reanalysing = false;
    candidateProfile: any = null;
    loading = true;
    iaDetails: string = '';

    ngOnInit() {
        this.langChangeSub = this.translate.onLangChange.subscribe(() => {
            if (this.dossier) this.updateIADetails(this.dossier);
        });

        const id = this.route.snapshot.paramMap.get('id');
        
        if (id) {
            this.loadCandidateProfile(parseInt(id));
            
            // REFACTORED: Listen to concours changes
            this.concoursSub = this.concoursService.selectedConcoursId$.subscribe(cid => {
                this.loading = true;
                this.dossier = null;
                this.loadDossier(parseInt(id), cid || undefined);
            });
        }
    }

    ngOnDestroy() {
        if (this.langChangeSub) this.langChangeSub.unsubscribe();
        if (this.concoursSub) this.concoursSub.unsubscribe();
    }

    loadDossier(candidatId: number, preferredConcoursId?: string) {
        if (preferredConcoursId) {
            this.executeLoadDossier(candidatId, preferredConcoursId);
            return;
        }

        // Sinon obtenir le concours actif par défaut
        this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
            next: (resp) => {
                const concoursId = resp.content.length > 0 ? resp.content[0].id : null;
                if (concoursId) {
                    this.executeLoadDossier(candidatId, concoursId);
                } else {
                    this.loading = false;
                }
            },
            error: () => this.loading = false
        });
    }

    private executeLoadDossier(candidatId: number, concoursId: string) {
        this.dossierService.getDossierByCandidat(candidatId, concoursId).subscribe({
            next: (dossier) => {
                this.dossier = dossier;
                if (dossier?.evaluationIA) {
                    this.updateIADetails(dossier);
                }
                this.loading = false;
            },
            error: (err) => {
                console.error('Erreur chargement dossier via search', err);
                this.loading = false;
            }
        });
    }

    reAnalyser() {
        if (!this.dossier) return;
        this.reanalysing = true;

        // On récupère le profil complet pour avoir CIN, Date Naissance, etc.
        this.authService.getProfile().subscribe({
            next: (profile) => {
                const iaData = {
                    cin: profile.cin,
                    nom: profile.nom,
                    prenom: profile.prenom,
                    dateNaissance: profile.dateNaissance,
                    dateDiplome: this.dossier?.dateDiplome
                };

                this.dossierService.checkIA(this.dossier!.id, iaData).subscribe({
                    next: () => {
                        const oldBatchId = this.dossier?.evaluationIA?.analysisBatchId;
                        this.pollResults(this.dossier!.candidatId, oldBatchId, 0);
                    },
                    error: (err) => {
                        console.error('Erreur lors de la ré-analyse IA', err);
                        this.reanalysing = false;
                    }
                });
            },
            error: (err) => {
                console.error('Erreur chargement profil pour IA', err);
                this.reanalysing = false;
            }
        });
    }

    pollResults(candidatId: number, oldBatchId: string | undefined, attempts: number) {
        if (attempts >= 120) {
            this.reanalysing = false;
            this.loadDossier(candidatId);
            return;
        }

        setTimeout(() => {
            this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
                next: (resp) => {
                    const concoursId = resp.content.length > 0 ? resp.content[0].id : null;
                    if (concoursId) {
                        this.dossierService.getDossierByCandidat(candidatId, concoursId).subscribe({
                            next: (dossier) => {
                                const evaluation = dossier.evaluationIA;
                                const newBatchId = evaluation?.analysisBatchId;
                                const status = evaluation?.analysisStatus;

                                if (newBatchId && newBatchId !== oldBatchId && status === 'DONE') {
                                    this.dossier = dossier;
                                    this.updateIADetails(dossier);
                                    this.reanalysing = false;
                                } else if (status === 'FAILED') {
                                    this.dossier = dossier;
                                    this.updateIADetails(dossier);
                                    this.reanalysing = false;
                                } else {
                                    this.pollResults(candidatId, oldBatchId, attempts + 1);
                                }
                            }
                        });
                    }
                }
            });
        }, 2000);
    }

    private updateIADetails(dossier: any) {
        if (dossier.evaluationIA) {
            const scoreId = dossier.evaluationIA.scoreCin !== null && dossier.evaluationIA.scoreCin !== undefined ? Math.round(dossier.evaluationIA.scoreCin) : null;
            const scoreDip = dossier.evaluationIA.scoreDiplome !== null && dossier.evaluationIA.scoreDiplome !== undefined ? Math.round(dossier.evaluationIA.scoreDiplome) : null;
            const scorePho = dossier.evaluationIA.scorePhoto !== null && dossier.evaluationIA.scorePhoto !== undefined ? Math.round(dossier.evaluationIA.scorePhoto) : null;

            const details = [];
            if (scoreId !== null) details.push(`${this.translate.instant('DOSSIER_DETAIL.IA.IDENTITY')}: ${scoreId}%`);
            if (scoreDip !== null) details.push(`${this.translate.instant('DOSSIER_DETAIL.IA.DIPLOMA')}: ${scoreDip}%`);
            
            const photoDetail = scorePho !== null ? `${this.translate.instant('DOSSIER_DETAIL.IA.PHOTO')}: ${scorePho}%` : null;
            
            if (details.length > 0 && photoDetail) {
                this.iaDetails = details.join(' | ') + '\n' + photoDetail;
            } else if (photoDetail) {
                this.iaDetails = photoDetail;
            } else {
                this.iaDetails = details.join(' | ');
            }
        }
    }

    loadCandidateProfile(id: number) {
        this.authService.getUsers().subscribe({
            next: (users) => {
                this.candidateProfile = users.find(u => u.id === id);
            }
        });
    }

    getStatutLabel(statut: string): string {
        switch (statut) {
            case 'VALIDE': return this.translate.instant('DOSSIER_DETAIL.STATUS.VALIDE');
            case 'EN_ATTENTE': return this.translate.instant('DOSSIER_DETAIL.STATUS.EN_ATTENTE');
            case 'REJETE': return this.translate.instant('DOSSIER_DETAIL.STATUS.REJETE');
            default: return this.translate.instant('DOSSIER_DETAIL.STATUS.PENDING');
        }
    }

    getUploadUrl(chemin: string): string {
        if (!chemin) return '#';
        const base = window.location.origin.replace(':4200', ':8080');
        return `${base}/api/dossiers/uploads/${chemin}`;
    }
}
