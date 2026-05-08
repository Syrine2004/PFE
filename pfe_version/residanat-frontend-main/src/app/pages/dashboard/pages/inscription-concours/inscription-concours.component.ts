import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import { DossierService, DossierCandidature, TypeDocument } from '../../../../core/services/dossier.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-inscription-concours',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, TranslateModule],
    templateUrl: './inscription-concours.component.html',
    styleUrl: './inscription-concours.component.scss'
})
export class InscriptionConcoursComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private concoursService = inject(ConcoursService);
    private authService = inject(AuthService);
    private dossierService = inject(DossierService);
    private fb = inject(FormBuilder);
    private translate = inject(TranslateService);
    private langChangeSub?: Subscription;

    concours: Concours | null = null;
    dossier: DossierCandidature | null = null;
    currentStep = 1;
    showAutreFaculte = false;
    inscriptionForm!: FormGroup;
    certifChecked = false;   // contrôle la checkbox "Je certifie..."
    step1Errors = false;     // affiche les erreurs du step 1

    // Track uploads
    uploadedDocs = new Set<string>();
    uploading = new Map<string, boolean>();
    fileNames = new Map<string, string>();
    isCheckingIA = false;
    iaCheckMessage = "";

    documentType: string = 'CIN';

    facultes: any[] = [];

    private initLabels() {
        this.facultes = [
            { value: 'tunis', label: this.translate.instant('INSCRIPTION_CONCOURS.STEP1.FACULTES.TUNIS') },
            { value: 'sousse', label: this.translate.instant('INSCRIPTION_CONCOURS.STEP1.FACULTES.SOUSSE') },
            { value: 'monastir', label: this.translate.instant('INSCRIPTION_CONCOURS.STEP1.FACULTES.MONASTIR') },
            { value: 'sfax', label: this.translate.instant('INSCRIPTION_CONCOURS.STEP1.FACULTES.SFAX') },
            { value: 'etranger', label: this.translate.instant('INSCRIPTION_CONCOURS.STEP1.FACULTES.ETRANGER') }
        ];
    }

    constructor() {
        this.initForm();
    }

    private initForm() {
        this.inscriptionForm = this.fb.group({
            nom: ['', Validators.required],
            prenom: ['', Validators.required],
            cin: ['', Validators.required],
            dateNaissance: ['', Validators.required],
            nationalite: ['', Validators.required],
            dateDiplome: ['', Validators.required],
            faculte: ['', Validators.required],
            autreFaculte: ['']
        });
    }

    get isDossierLocked(): boolean {
        return this.dossier?.statut === 'VALIDE';
    }

    get isEditingMode(): boolean {
        return this.dossier?.statut === 'EN_ATTENTE' || this.dossier?.statut === 'REJETE';
    }

    onFaculteChange(event: Event) {
        const selectElement = event.target as HTMLSelectElement;
        this.showAutreFaculte = selectElement.value === 'autre';
    }

    isInvalid(field: string): boolean {
        const ctrl = this.inscriptionForm.get(field);
        return !!(ctrl && ctrl.invalid && this.step1Errors);
    }

    /** Converts any backend date value (ISO string or [year, month, day] array) to `YYYY-MM-DD` for HTML date inputs */
    private toISODate(value: any): string {
        if (!value) return '';
        // Java LocalDate serialized as array: [2023, 6, 15]
        if (Array.isArray(value) && value.length >= 3) {
            const y = value[0];
            const m = String(value[1]).padStart(2, '0');
            const d = String(value[2]).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        // Already an ISO string like "2023-06-15"
        if (typeof value === 'string') {
            // Handle dd/mm/yyyy or dd-mm-yyyy
            const parts = value.split(/[\/-]/);
            if (parts.length === 3 && parts[0].length === 2) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            return value; // Already YYYY-MM-DD
        }
        return '';
    }

    isConcoursClosed(dateFin?: string): boolean {
        if (!dateFin) return false;
        return new Date() > new Date(dateFin);
    }

    private calculateAge(birthDate: string): number {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    ngOnInit() {
        this.initLabels();
        this.langChangeSub = this.translate.onLangChange.subscribe(() => this.initLabels());

        this.authService.getProfile().subscribe({
            next: (profile: any) => {
                if (!profile) return;

                const normalize = (s: string) => s ? s.toLowerCase().trim() : '';
                const standardValues = this.facultes.map(f => normalize(f.value));
                let dbFaculte = profile.faculte || '';
                let normalizedDbFaculte = normalize(dbFaculte);
                let selectedFaculte = '';
                let customFaculte = '';

                this.documentType = profile.typeDocumentIdentite || 'CIN';

                if (normalizedDbFaculte) {
                    if (standardValues.includes(normalizedDbFaculte)) {
                        selectedFaculte = normalizedDbFaculte;
                    } else {
                        selectedFaculte = 'autre';
                        customFaculte = dbFaculte;
                        this.showAutreFaculte = true;
                    }
                }

                this.inscriptionForm.patchValue({
                    nom: profile.nom || '',
                    prenom: profile.prenom || '',
                    cin: profile.cin || '',
                    dateNaissance: this.toISODate(profile.dateNaissance),
                    nationalite: profile.nationalite || '',
                    faculte: selectedFaculte || '',
                    autreFaculte: customFaculte || ''
                });

                if (selectedFaculte === 'autre') {
                    this.showAutreFaculte = true;
                }

                this.initDossierData(profile.id);
            },
            error: (err) => console.error('Erreur lors de la récupération du profil', err)
        });

        this.route.queryParams.subscribe(params => {
            const concoursId = params['concoursId'];
            if (concoursId) {
                this.concoursService.getConcoursById(concoursId).subscribe({
                    next: (res) => {
                        if (res?.etat === 'PUBLIE' && !this.isConcoursClosed(res.dateFin)) {
                            this.concours = res;
                        } else {
                            this.loadFirstPublishedConcours();
                        }
                    },
                    error: () => this.loadFirstPublishedConcours()
                });
            } else {
                this.loadFirstPublishedConcours();
            }
        });
    }

    ngOnDestroy() {
        if (this.langChangeSub) {
            this.langChangeSub.unsubscribe();
        }
    }

    private loadFirstPublishedConcours() {
        this.concoursService.getConcours(0, 10, undefined, undefined, 'PUBLIE').subscribe({
            next: (res) => {
                const activeConcours = res.content.find(c => !this.isConcoursClosed(c.dateFin));
                if (activeConcours) {
                    this.concours = activeConcours;
                } else {
                    this.showClosedError();
                }
            },
            error: (err) => console.error(err)
        });
    }

    private showClosedError() {
        Swal.fire({
            icon: 'info',
            title: this.translate.instant('ADMIN_CONCOURS.STATUS.TERMINE'),
            text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.CLOSED_DESC') || 'La période d\'inscription pour ce concours est terminée.',
            confirmButtonColor: '#008fbb',
            confirmButtonText: 'OK'
        }).then(() => {
            this.router.navigate(['/dashboard']);
        });
    }

    private initDossierData(candidatId: number) {
        const interval = setInterval(() => {
            if (this.concours && this.concours.id) {
                clearInterval(interval);
                this.dossierService.initDossier(candidatId, this.concours.id).subscribe({
                    next: (dossier) => {
                        this.dossier = dossier;
                        dossier.documents.forEach(doc => {
                            this.uploadedDocs.add(doc.type);
                            if (doc.nom) {
                                this.fileNames.set(doc.type, doc.nom);
                            }
                        });

                        // Pre-fill dateDiplome from saved dossier if it exists
                        if (dossier.dateDiplome) {
                            this.inscriptionForm.patchValue({ dateDiplome: dossier.dateDiplome });
                        }

                        if (this.isDossierLocked) {
                            this.inscriptionForm.disable();
                        }
                    },
                    error: (err) => {
                        console.error('Erreur Dossier', err);
                        Swal.fire({
                            icon: 'error',
                            title: 'Erreur d\'initialisation',
                            text: 'Impossible de créer votre dossier. Veuillez contacter l\'administrateur ou vérifier votre connexion.',
                            confirmButtonColor: '#ef4444'
                        });
                    }
                });
            }
        }, 500);
    }

    onFileUpload(event: any, type: string) {
        const file = event.target.files[0];
        
        if (!this.dossier) {
            Swal.fire({
                title: 'Dossier non prêt',
                text: 'Veuillez patienter pendant l\'initialisation de votre dossier ou rechargez la page.',
                icon: 'warning',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        if (!file) return;

        // If the type passed is the hardcoded 'CIN' from HTML, use the dynamically determined documentType instead
        // Ensure uppercase for enum mapping
        const actualType = (type === 'CIN' ? this.documentType : type).toUpperCase();
        
        const docType = actualType as keyof typeof TypeDocument;
        
        if (!TypeDocument[docType]) {
            console.error('Invalid document type:', actualType);
            return;
        }

        // ✅ Validation du format et de la taille
        const filename = file.name.toLowerCase();
        const fileSizeMb = file.size / (1024 * 1024);

        if (actualType === 'PHOTO_IDENTITE') {
            const allowed = ['.jpg', '.jpeg', '.png'];
            if (!allowed.some(ext => filename.endsWith(ext))) {
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.FORMAT_ERROR'),
                    text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.PHOTO_FORMAT_DESC'),
                    confirmButtonColor: '#008fbb'
                });
                return;
            }
            if (fileSizeMb > 2) {
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.SIZE_ERROR'),
                    text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.PHOTO_SIZE_DESC'),
                    confirmButtonColor: '#008fbb'
                });
                return;
            }
        } else {
            const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
            if (!allowed.some(ext => filename.endsWith(ext))) {
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.FORMAT_ERROR'),
                    text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.DOC_FORMAT_DESC'),
                    confirmButtonColor: '#008fbb'
                });
                return;
            }
            if (fileSizeMb > 5) {
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.SIZE_ERROR'),
                    text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.DOC_SIZE_DESC'),
                    confirmButtonColor: '#008fbb'
                });
                return;
            }
        }

        this.uploading.set(actualType, true);
        // Force update for spinner visibility
        this.uploading = new Map(this.uploading);

        this.dossierService.uploadDocument(this.dossier.id, file, TypeDocument[docType]).subscribe({
            next: (doc) => {
                this.uploadedDocs.add(actualType);
                this.uploadedDocs = new Set(this.uploadedDocs); // Force UI update
                
                this.fileNames.set(actualType, file.name);
                this.fileNames = new Map(this.fileNames); // Force UI update
                
                this.uploading.set(actualType, false);
                this.uploading = new Map(this.uploading); // Force UI update

                Swal.fire({
                    title: 'Succès',
                    text: 'Document téléchargé avec succès.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            error: (err) => {
                console.error('Upload Error', err);
                this.uploading.set(actualType, false);
                this.uploading = new Map(this.uploading);

                Swal.fire({
                    title: 'Erreur',
                    text: 'Impossible de télécharger le document. Veuillez réessayer.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        });
    }

    nextStep() {
        if (this.currentStep === 1) {
            this.step1Errors = true;
            const requiredFields = ['nom', 'prenom', 'cin', 'dateNaissance', 'nationalite', 'dateDiplome', 'faculte'];
            const allFilled = requiredFields.every(f => {
                const ctrl = this.inscriptionForm.get(f);
                return ctrl && ctrl.valid;
            });
            if (!this.dossier && !this.isDossierLocked) {
                Swal.fire({
                    icon: 'error',
                    title: 'Dossier non initialisé',
                    text: 'Impossible de continuer car votre dossier de candidature n\'a pas pu être créé. Vérifiez votre connexion au serveur.',
                    confirmButtonColor: '#ef4444'
                });
                return;
            }

            if (!allFilled && !this.isDossierLocked) {
                Swal.fire({
                    icon: 'warning',
                    title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.REQUIRED_TITLE'),
                    text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.REQUIRED_DESC'),
                    confirmButtonColor: '#008fbb'
                });
                return;
            }

            // Validation de l'âge (minimum 19 ans)
            const birthDate = this.inscriptionForm.get('dateNaissance')?.value;
            if (birthDate && this.calculateAge(birthDate) < 19) {
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('COMMON.ERROR'),
                    text: 'Vous devez avoir au moins 19 ans pour vous inscrire à ce concours.',
                    confirmButtonColor: '#008fbb'
                });
                return;
            }

            // Save dateDiplome and all candidat info to dossier in DB when advancing from step 1
            const dateDiplome = this.inscriptionForm.get('dateDiplome')?.value;
            if (this.dossier && dateDiplome) {
                this.dossierService.saveDataDiplome(this.dossier.id, dateDiplome).subscribe({
                    error: (err) => console.warn('Sauvegarde dateDiplome ignorée:', err)
                });
            }

            // Sauvegarder toutes les infos personnelles modifiées
            if (this.dossier) {
                const candidateData = this.getMergedCandidateData();
                this.dossierService.updateCandidatInfo(this.dossier.id, candidateData).subscribe({
                    next: () => {
                        console.log('Infos candidat mises à jour avec succès');
                    },
                    error: (err) => {
                        console.warn('Erreur mise à jour infos candidat:', err);
                    }
                });
            }
        }
        if (this.currentStep < 3) {
            this.currentStep++;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    submitForm() {
        if (this.dossier) {
            this.isCheckingIA = true;
            this.iaCheckMessage = this.translate.instant('INSCRIPTION_CONCOURS.STEP3.IA_MESSAGE.INIT');

            const candidateData = this.getMergedCandidateData();

            // D'abord, mettre à jour les infos personnelles du candidat dans la table utilisateur (non-blocking)
            this.dossierService.updateCandidatInfo(this.dossier.id, candidateData).subscribe({
                next: () => {
                    console.log('Infos candidat mises à jour avec succès');
                },
                error: (err) => {
                    console.warn('Erreur mise à jour infos candidat (non-bloquant):', err);
                }
            });

            // Ensuite, lancer l'analyse IA immédiatement
            setTimeout(() => {
                this.dossierService.checkIA(this.dossier!.id, candidateData).subscribe({
                    next: () => {
                        this.iaCheckMessage = this.translate.instant('INSCRIPTION_CONCOURS.STEP3.IA_MESSAGE.LANCEMENT');
                        this.waitForIACompletion(0);
                    },
                    error: (err) => {
                        console.error('Erreur IA', err);
                        this.isCheckingIA = false;
                        this.iaCheckMessage = this.translate.instant('INSCRIPTION_CONCOURS.STEP3.IA_MESSAGE.FAILED');
                        Swal.fire({
                            icon: 'error',
                            title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.IA_FAILED_TITLE'),
                            text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.IA_FAILED_RETRY_DESC'),
                            confirmButtonColor: '#008fbb'
                        });
                    }
                });
            }, 500);
        }
    }

    private waitForIACompletion(attempt: number) {
        if (!this.dossier) return;

        const maxAttempts = 120;
        if (attempt >= maxAttempts) {
            this.isCheckingIA = false;
            this.iaCheckMessage = this.translate.instant('INSCRIPTION_CONCOURS.STEP3.IA_MESSAGE.FAILED');
            Swal.fire({
                icon: 'warning',
                title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.IA_WAIT_TITLE'),
                text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.IA_WAIT_DESC'),
                confirmButtonColor: '#008fbb'
            });
            return;
        }

        this.dossierService.getDossier(this.dossier.id).subscribe({
            next: (updatedDossier) => {
                this.dossier = updatedDossier;
                const evaluation = updatedDossier.evaluationIA;
                const status = evaluation?.analysisStatus;
                const completed = evaluation?.completedChecks ?? 0;
                const expected = evaluation?.expectedChecks ?? 0;

                if (status === 'DONE') {
                    this.iaCheckMessage = this.translate.instant('INSCRIPTION_CONCOURS.STEP3.IA_MESSAGE.VALIDATED');
                    this.isCheckingIA = false;
                    this.executeSubmit();
                    return;
                }

                if (status === 'FAILED') {
                    this.isCheckingIA = false;
                    this.iaCheckMessage = this.translate.instant('INSCRIPTION_CONCOURS.STEP3.IA_MESSAGE.FAILED');
                    Swal.fire({
                        icon: 'error',
                        title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.IA_FAILED_TITLE'),
                        text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.IA_FAILED_DESC'),
                        confirmButtonColor: '#008fbb'
                    });
                    return;
                }

                this.iaCheckMessage = this.translate.instant('INSCRIPTION_CONCOURS.STEP3.IA_MESSAGE.PROGRESS', { completed: completed, expected: expected });
                setTimeout(() => this.waitForIACompletion(attempt + 1), 3000);
            },
            error: () => {
                setTimeout(() => this.waitForIACompletion(attempt + 1), 3000);
            }
        });
    }

    private executeSubmit() {
        if (!this.dossier) return;

        this.dossierService.updateStatut(this.dossier.id, 'EN_ATTENTE' as any).subscribe({
            next: () => {
                Swal.fire({
                    icon: 'success',
                    title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.SUCCESS_TITLE'),
                    text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.SUCCESS_DESC'),
                    confirmButtonColor: '#008fbb',
                    confirmButtonText: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.SUCCESS_BTN')
                }).then(() => {
                    this.dossierService.notifyDossierUpdate();
                    this.router.navigate(['/dashboard']);
                });
            },
            error: () => {
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.ERROR_TITLE'),
                    text: this.translate.instant('INSCRIPTION_CONCOURS.SWAL.ERROR_DESC'),
                    confirmButtonColor: '#008fbb'
                });
            }
        });
    }

    private getMergedCandidateData(): any {
        const data = { ...this.inscriptionForm.value };
        if (data.faculte === 'autre' && data.autreFaculte) {
            data.faculte = data.autreFaculte;
        }
        delete data.autreFaculte;
        return data;
    }
}
