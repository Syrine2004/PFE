import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DossierService, DossierCandidature } from '../../../../core/services/dossier.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConcoursService } from '../../../../core/services/concours.service';

@Component({
    selector: 'app-dossier-detail',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './dossier-detail.component.html',
    styleUrl: './dossier-detail.component.scss'
})
export class DossierDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private dossierService = inject(DossierService);
    private concoursService = inject(ConcoursService);
    public authService = inject(AuthService);

    dossier: DossierCandidature | null = null;
    reanalysing = false;
    candidateProfile: any = null;
    loading = true;
    iaDetails: string = '';

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadDossier(parseInt(id));
            this.loadCandidateProfile(parseInt(id));
        }
    }

    loadDossier(candidatId: number) {
        // Obtenir le concours actif d'abord
        this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
            next: (resp) => {
                const concoursId = resp.content.length > 0 ? resp.content[0].id : null;
                if (concoursId) {
                    this.dossierService.getDossierByCandidat(candidatId, concoursId).subscribe({
                        next: (dossier) => {
                            this.dossier = dossier;
                            if (dossier.evaluationIA) {
                                 const scoreId = dossier.evaluationIA.scoreCin !== null && dossier.evaluationIA.scoreCin !== undefined ? Math.round(dossier.evaluationIA.scoreCin) : null;
                                 const scoreDip = dossier.evaluationIA.scoreDiplome !== null && dossier.evaluationIA.scoreDiplome !== undefined ? Math.round(dossier.evaluationIA.scoreDiplome) : null;
                                 const scorePho = dossier.evaluationIA.scorePhoto !== null && dossier.evaluationIA.scorePhoto !== undefined ? Math.round(dossier.evaluationIA.scorePhoto) : null;

                                 const details = [];
                                 if (scoreId !== null) details.push(`Identité: ${scoreId}%`);
                                 if (scoreDip !== null) details.push(`Diplôme: ${scoreDip}%`);
                                 
                                 const photoDetail = scorePho !== null ? `Photo: ${scorePho}%` : null;
                                 
                                 if (details.length > 0 && photoDetail) {
                                     this.iaDetails = details.join(' | ') + '\n' + photoDetail;
                                 } else if (photoDetail) {
                                     this.iaDetails = photoDetail;
                                 } else {
                                     this.iaDetails = details.join(' | ');
                                 }
                            }
                            this.loading = false;
                        },
                        error: (err) => {
                            console.error('Erreur chargement dossier via search', err);
                            this.loading = false;
                        }
                    });
                } else {
                    this.loading = false;
                }
            },
            error: () => this.loading = false
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
                    dateNaissance: profile.dateNaissance
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
            if (scoreId !== null) details.push(`Identité: ${scoreId}%`);
            if (scoreDip !== null) details.push(`Diplôme: ${scoreDip}%`);
            
            const photoDetail = scorePho !== null ? `Photo: ${scorePho}%` : null;
            
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
            case 'VALIDE': return 'Dossier Validé';
            case 'EN_ATTENTE': return 'En cours de vérification';
            case 'REJETE': return 'Dossier Rejeté';
            default: return 'Non soumis';
        }
    }
}
