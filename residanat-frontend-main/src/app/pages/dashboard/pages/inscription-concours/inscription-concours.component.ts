import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import { DossierService, DossierCandidature, TypeDocument } from '../../../../core/services/dossier.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-inscription-concours',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
    templateUrl: './inscription-concours.component.html',
    styleUrl: './inscription-concours.component.scss'
})
export class InscriptionConcoursComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private concoursService = inject(ConcoursService);
    private authService = inject(AuthService);
    private dossierService = inject(DossierService);
    private fb = inject(FormBuilder);

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

    facultes = [
        { value: 'tunis', label: 'Faculté de Médecine de Tunis' },
        { value: 'sousse', label: 'Faculté de Médecine de Sousse' },
        { value: 'monastir', label: 'Faculté de Médecine de Monastir' },
        { value: 'sfax', label: 'Faculté de Médecine de Sfax' },
        { value: 'etranger', label: 'Faculté Étrangère' }
    ];

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
        return this.dossier?.statut === 'VALIDE' || this.dossier?.statut === 'REJETE';
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

    ngOnInit() {
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
                    next: (res) => this.concours = res,
                    error: (err) => console.error(err)
                });
            } else {
                this.concoursService.getConcours(0, 1, undefined, undefined, 'PUBLIE').subscribe({
                    next: (res) => {
                        if (res.content.length > 0) this.concours = res.content[0];
                    },
                    error: (err) => console.error(err)
                });
            }
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
                    error: (err) => console.error('Erreur Dossier', err)
                });
            }
        }, 500);
    }

    onFileUpload(event: any, type: string) {
        const file = event.target.files[0];
        if (!file || !this.dossier) return;

        // If the type passed is the hardcoded 'CIN' from HTML, use the dynamically determined documentType instead
        const actualType = type === 'CIN' ? this.documentType : type;

        this.uploading.set(actualType, true);
        const docType = actualType as keyof typeof TypeDocument;

        this.dossierService.uploadDocument(this.dossier.id, file, TypeDocument[docType]).subscribe({
            next: (doc) => {
                this.uploadedDocs.add(actualType);
                this.fileNames.set(actualType, file.name);
                this.uploading.set(actualType, false);
            },
            error: (err) => {
                console.error('Upload Error', err);
                this.uploading.set(actualType, false);
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
            if (!allFilled && !this.isDossierLocked) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Champs obligatoires',
                    text: 'Veuillez remplir tous les champs avant de continuer.',
                    confirmButtonColor: '#008fbb'
                });
                return;
            }

            // Save dateDiplome to dossier in DB when advancing from step 1
            const dateDiplome = this.inscriptionForm.get('dateDiplome')?.value;
            if (this.dossier && dateDiplome) {
                this.dossierService.saveDataDiplome(this.dossier.id, dateDiplome).subscribe({
                    error: (err) => console.warn('Sauvegarde dateDiplome ignorée:', err)
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
            this.iaCheckMessage = "Initialisation de l'analyse IA...";

            const candidateData = this.inscriptionForm.value;

            // On appelle le service IA via le backend
            this.dossierService.checkIA(this.dossier.id, candidateData).subscribe({
                next: () => {
                    this.iaCheckMessage = "Analyse IA lancée. Attente du score final...";
                    this.waitForIACompletion(0);
                },
                error: (err) => {
                    console.error('Erreur IA', err);
                    this.isCheckingIA = false;
                    this.iaCheckMessage = "Erreur IA. Relancez l'analyse.";
                    Swal.fire({
                        icon: 'error',
                        title: 'Analyse IA échouée',
                        text: 'Impossible de lancer une analyse fiable. Veuillez réessayer.',
                        confirmButtonColor: '#008fbb'
                    });
                }
            });
        }
    }

    private waitForIACompletion(attempt: number) {
        if (!this.dossier) return;

        const maxAttempts = 120;
        if (attempt >= maxAttempts) {
            this.isCheckingIA = false;
            this.iaCheckMessage = "Temps d'attente dépassé. Vérifiez l'état IA puis réessayez.";
            Swal.fire({
                icon: 'warning',
                title: 'Analyse IA en attente',
                text: 'Le score final n\'est pas encore prêt. Merci de réessayer dans quelques instants.',
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
                    this.iaCheckMessage = "Score IA final validé.";
                    this.isCheckingIA = false;
                    this.executeSubmit();
                    return;
                }

                if (status === 'FAILED') {
                    this.isCheckingIA = false;
                    this.iaCheckMessage = "Analyse IA échouée. Corrigez les documents puis relancez.";
                    Swal.fire({
                        icon: 'error',
                        title: 'Analyse IA échouée',
                        text: 'Le score final n\'a pas pu être validé. Corrigez les documents puis réessayez.',
                        confirmButtonColor: '#008fbb'
                    });
                    return;
                }

                this.iaCheckMessage = `Analyse IA en cours (${completed}/${expected})...`;
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
                    title: 'Inscription envoyée !',
                    text: 'Votre candidature a été soumise avec succès. Vous recevrez une confirmation prochainement.',
                    confirmButtonColor: '#008fbb',
                    confirmButtonText: 'Retour au tableau de bord'
                }).then(() => {
                    this.router.navigate(['/dashboard']);
                });
            },
            error: () => {
                Swal.fire({
                    icon: 'error',
                    title: 'Erreur',
                    text: 'Une erreur est survenue. Veuillez réessayer.',
                    confirmButtonColor: '#008fbb'
                });
            }
        });
    }
}
