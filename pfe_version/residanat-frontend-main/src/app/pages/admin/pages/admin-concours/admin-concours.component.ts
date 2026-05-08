import { Component, OnInit, inject, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EditConcoursSheetComponent } from './components/edit-concours-sheet/edit-concours-sheet.component';
import { PremiumAlertComponent } from '../../../../shared/components/premium-alert/premium-alert.component';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import { DossierService } from '../../../../core/services/dossier.service';
import { forkJoin, Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-admin-concours',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, EditConcoursSheetComponent, PremiumAlertComponent, TranslateModule],
    templateUrl: './admin-concours.component.html',
    styleUrl: './admin-concours.component.scss'
})
export class AdminConcoursComponent implements OnInit {
    private concoursService = inject(ConcoursService);
    private dossierService = inject(DossierService);
    private renderer = inject(Renderer2);
    private translate = inject(TranslateService);
    private langChangeSub?: Subscription;
    isProcessing = false;
    today = new Date().toISOString().split('T')[0];

    searchQuery = '';
    isCreateModalOpen = false;
    showTypeDropdown = false;

    toggleTypeDropdown(event: Event) {
        event.stopPropagation();
        this.showTypeDropdown = !this.showTypeDropdown;
    }

    selectType(type: string) {
        this.newConcours.type = type;
        this.showTypeDropdown = false;
    }

    // New concours form data
    newConcours = {
        titre: '',
        annee: new Date().getFullYear(),
        type: 'National',
        dateDebut: '',
        dateFin: ''
    };

    activeDropdownId: string | null = null;
    isEditSheetOpen = false;
    selectedConcours: Concours | null = null;

    // Alert states
    alertConfig = {
        isOpen: false,
        type: 'success' as 'success' | 'warning' | 'error',
        title: '',
        message: '',
        confirmText: 'OK',
        cancelText: 'Annuler',
        showCancel: false,
        selectedItem: '',
        action: () => { }
    };

    concoursList: Concours[] = [];
    totalElements: number = 0;

    // Server-side pagination parameters
    currentPage = 0;
    pageSize = 10;

    ngOnInit() {
        this.loadConcours();
    }

    private mapToFrontend(c: Concours): Concours {
        return {
            ...c,
            titre: c.libelle,
            type: c.typeConcours,
            statut: c.etat ? c.etat.toLowerCase() : 'non_publie',
            actif: c.etat === 'PUBLIE',
            // Format dates to YYYY-MM-DD for native date inputs
            dateDebut: c.dateDebut ? c.dateDebut.substring(0, 10) : '',
            dateFin: c.dateFin ? c.dateFin.substring(0, 10) : ''
        };
    }

    loadConcours() {
        forkJoin({
            concours: this.concoursService.getConcours(this.currentPage, this.pageSize),
            dossiers: this.dossierService.getAllDossiers()
        }).subscribe({
            next: (response) => {
                const dossiers = response.dossiers;
                this.concoursList = response.concours.content.map(c => {
                    const mapped = this.mapToFrontend(c);
                    // Count candidates for this concoursId
                    mapped.nbCandidats = dossiers.filter(d => d.concoursId === c.id).length;
                    return mapped;
                });
                this.totalElements = response.concours.totalElements;
            },
            error: (err) => {
                console.error('Erreur lors du chargement des concours et dossiers', err);
                this.showAlert({
                    type: 'error',
                    title: this.translate.instant('COMMON.ERROR'),
                    message: this.translate.instant('COMMON.ERROR_DESC'),
                    confirmText: this.translate.instant('COMMON.CLOSE')
                });
            }
        });
    }

    get filteredConcours() {
        if (!this.searchQuery) return this.concoursList;
        return this.concoursList.filter(c => {
            const libelle = c.titre || '';
            const annee = c.annee ? c.annee.toString() : '';
            return libelle.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                annee.includes(this.searchQuery);
        });
    }

    get stats() {
        return {
            total: this.totalElements,
            publies: this.concoursList.filter(c => c.statut === 'publie').length
        };
    }

    isConcoursClosed(dateFin: string): boolean {
        if (!dateFin) return false;
        return new Date() > new Date(dateFin);
    }

    togglePublish(concours: Concours) {
        if (!concours.id || this.isProcessing) return;

        const isCurrentlyPublished = concours.statut === 'publie' || concours.statut === '1';

        if (!isCurrentlyPublished) {
            // PUBLIER : On affiche TOUJOURS une confirmation (car cela impacte les autres concours)
            Swal.fire({
                title: this.translate.instant('ADMIN_CONCOURS.ALERTS.CONFIRM_PUBLISH_TITLE') || 'Confirmer la publication',
                text: `Voulez-vous publier le concours "${concours.titre}" ? Tout autre concours actif sera automatiquement dépublié pour garantir qu'un seul concours est ouvert aux candidats.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#008fbb',
                cancelButtonColor: '#d33',
                confirmButtonText: this.translate.instant('COMMON.YES_PUBLISH') || 'Oui, publier',
                cancelButtonText: this.translate.instant('COMMON.CANCEL') || 'Annuler'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.executeTogglePublish(concours.id!, true);
                }
            });
        } else {
            // DÉPUBLIER : On le fait directement ("3adi") comme demandé
            this.executeTogglePublish(concours.id!, false);
        }
    }

    private executeTogglePublish(id: string, isPublishing: boolean) {
        this.isProcessing = true;
        const action = isPublishing
            ? this.concoursService.publishConcours(id)
            : this.concoursService.unpublishConcours(id);

        action.subscribe({
            next: (updated) => {
                // Mise à jour locale immédiate pour forcer la réactivité de l'UI
                this.concoursList = this.concoursList.map(c => {
                    if (c.id === id) {
                        return { ...c, statut: isPublishing ? 'publie' : 'non_publie' };
                    } else if (isPublishing && c.statut === 'publie') {
                        // On dépublie automatiquement les autres localement
                        return { ...c, statut: 'non_publie' };
                    }
                    return c;
                });

                this.loadConcours();
                this.isProcessing = false;
                
                // On n'affiche un succès que si c'était une publication avec warning ou un changement important
                if (isPublishing) {
                    Swal.fire({
                        icon: 'success',
                        title: this.translate.instant('COMMON.SUCCESS'),
                        text: 'Le concours a été publié avec succès.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            },
            error: (err) => {
                this.isProcessing = false;
                Swal.fire({
                    icon: 'error',
                    title: this.translate.instant('COMMON.ERROR'),
                    text: this.translate.instant('COMMON.ERROR_DESC'),
                    confirmButtonColor: '#008fbb'
                });
            }
        });
    }

    openCreateModal() {
        this.isCreateModalOpen = true;
    }

    onYearChange() {
        // Reset dates when year changes to force calendar view to new year
        this.newConcours.dateDebut = '';
        this.newConcours.dateFin = '';
    }

    closeCreateModal() {
        this.isCreateModalOpen = false;
    }

    createConcours() {
        // Validation: dateDebut <= dateFin
        if (this.newConcours.dateDebut && this.newConcours.dateFin) {
            if (new Date(this.newConcours.dateDebut) > new Date(this.newConcours.dateFin)) {
                this.showAlert({
                    type: 'warning',
                    title: this.translate.instant('ADMIN_CONCOURS.ALERTS.INVALID_DATES'),
                    message: this.translate.instant('ADMIN_CONCOURS.ALERTS.INVALID_DATES'),
                    confirmText: this.translate.instant('COMMON.VALIDATE')
                });
                return;
            }
        }
        if (!this.newConcours.titre || !this.newConcours.titre.trim()) {
            this.showAlert({
                type: 'error',
                title: this.translate.instant('COMMON.ERROR'),
                message: 'Le titre du concours est obligatoire.',
                confirmText: this.translate.instant('COMMON.CLOSE')
            });
            return;
        }

        this.concoursService.createConcours(this.newConcours).subscribe({
            next: (created) => {
                this.closeCreateModal();
                this.loadConcours(); // Refresh list to get proper pagination
                this.newConcours = { titre: '', annee: new Date().getFullYear(), type: 'National', dateDebut: '', dateFin: '' };
                this.showAlert({
                    type: 'success',
                    title: this.translate.instant('COMMON.SUCCESS'),
                    message: this.translate.instant('ADMIN_CONCOURS.ALERTS.CREATE_SUCCESS'),
                    confirmText: this.translate.instant('COMMON.CLOSE')
                });
            },
            error: (err) => {
                console.error('Erreur creation concours:', err);
                let msg = 'Une erreur est survenue lors de la création.';
                if (err.error && typeof err.error === 'object' && err.error.message) {
                    msg = err.error.message;
                } else if (err.status === 409) {
                    msg = 'Un concours avec ce libellé et cette année existe déjà.';
                } else {
                    msg = err.message || msg;
                }

                this.showAlert({
                    type: 'error',
                    title: this.translate.instant('COMMON.ERROR'),
                    message: msg,
                    confirmText: this.translate.instant('COMMON.CLOSE')
                });
            }
        });
    }

    toggleDropdown(event: Event, id: string | undefined) {
        if (!id) return;
        event.stopPropagation();
        this.activeDropdownId = this.activeDropdownId === id ? null : id;
    }

    closeDropdown() {
        this.activeDropdownId = null;
    }

    openEditSheet(concours: Concours) {
        // Map backend to frontend properties so the child component receives what it expects
        this.selectedConcours = { ...concours };
        this.isEditSheetOpen = true;
        this.closeDropdown();
    }

    closeEditSheet() {
        this.isEditSheetOpen = false;
        this.selectedConcours = null;
    }

    saveEdit(updated: Concours) {
        if (!updated.id) return;

        // Validation: dateDebut <= dateFin
        if (updated.dateDebut && updated.dateFin) {
            if (new Date(updated.dateDebut) > new Date(updated.dateFin)) {
                this.showAlert({
                    type: 'warning',
                    title: this.translate.instant('ADMIN_CONCOURS.ALERTS.INVALID_DATES'),
                    message: this.translate.instant('ADMIN_CONCOURS.ALERTS.INVALID_DATES'),
                    confirmText: this.translate.instant('COMMON.VALIDATE')
                });
                return;
            }
        }

        this.concoursService.updateConcours(updated.id, updated).subscribe({
            next: (res) => {
                this.closeEditSheet();
                this.loadConcours();
                this.showAlert({
                    type: 'success',
                    title: this.translate.instant('COMMON.SUCCESS'),
                    message: this.translate.instant('ADMIN_CONCOURS.ALERTS.EDIT_SUCCESS'),
                    confirmText: this.translate.instant('COMMON.CLOSE')
                });
            },
            error: (err) => {
                let msg = 'Impossible de modifier ce concours.';
                if (err.status === 409) {
                    msg = 'Un concours avec ces informations existe déjà.';
                }
                this.showAlert({
                    type: 'error',
                    title: this.translate.instant('COMMON.ERROR'),
                    message: msg,
                    confirmText: this.translate.instant('COMMON.CLOSE')
                });
            }
        });
    }

    deleteConcours(id: string | undefined) {
        if (!id) return;
        this.closeDropdown();
        const concours = this.concoursList.find(c => c.id === id);

        this.showAlert({
            type: 'warning',
            title: this.translate.instant('ADMIN_CONCOURS.ALERTS.DELETE_CONFIRM_TITLE'),
            message: this.translate.instant('ADMIN_CONCOURS.ALERTS.DELETE_CONFIRM_DESC', { name: concours ? (concours.titre || '') : '' }),
            confirmText: this.translate.instant('ADMIN_CONCOURS.BTN.DELETE'),
            cancelText: this.translate.instant('COMMON.CANCEL'),
            showCancel: true,
            selectedItem: concours ? (concours.titre || '') : '',
            action: () => {
                this.concoursService.deleteConcours(id).subscribe({
                    next: () => {
                        this.loadConcours();
                        setTimeout(() => {
                            this.showAlert({
                                type: 'success',
                                title: this.translate.instant('COMMON.SUCCESS'),
                                message: this.translate.instant('ADMIN_CONCOURS.ALERTS.DELETE_SUCCESS'),
                                confirmText: 'OK',
                                selectedItem: ''
                            });
                        }, 300);
                    },
                    error: () => {
                        this.showAlert({
                            type: 'error',
                            title: this.translate.instant('COMMON.ERROR'),
                            message: this.translate.instant('COMMON.ERROR_DESC'),
                            confirmText: this.translate.instant('COMMON.CLOSE')
                        });
                    }
                });
            }
        });
    }

    private showAlert(config: Partial<typeof this.alertConfig>) {
        this.alertConfig = {
            ...this.alertConfig,
            isOpen: true,
            showCancel: false,
            action: () => { },
            ...config
        };
    }

    onAlertConfirm() {
        if (this.alertConfig.action) {
            this.alertConfig.action();
        }
        this.alertConfig.isOpen = false;
    }

}
