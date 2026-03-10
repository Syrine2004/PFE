import { Component, OnInit, inject, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EditConcoursSheetComponent } from './components/edit-concours-sheet/edit-concours-sheet.component';
import { PremiumAlertComponent } from '../../../../shared/components/premium-alert/premium-alert.component';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import { DossierService } from '../../../../core/services/dossier.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-admin-concours',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, EditConcoursSheetComponent, PremiumAlertComponent],
    templateUrl: './admin-concours.component.html',
    styleUrl: './admin-concours.component.scss'
})
export class AdminConcoursComponent implements OnInit {
    private concoursService = inject(ConcoursService);
    private dossierService = inject(DossierService);
    private renderer = inject(Renderer2);

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
                    title: 'Erreur Serveur',
                    message: 'Impossible de récupérer les données des concours.',
                    confirmText: 'Fermer'
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

    togglePublish(concours: Concours) {
        if (!concours.id) return;

        const action = concours.statut === 'publie'
            ? this.concoursService.unpublishConcours(concours.id)
            : this.concoursService.publishConcours(concours.id);

        action.subscribe({
            next: (updated) => {
                const index = this.concoursList.findIndex(c => c.id === updated.id);
                if (index !== -1) {
                    this.concoursList[index] = this.mapToFrontend(updated);
                }
            },
            error: (err) => {
                this.showAlert({
                    type: 'error',
                    title: 'Erreur',
                    message: 'Impossible de modifier le statut de ce concours.',
                    confirmText: 'Fermer'
                });
            }
        });
    }

    openCreateModal() {
        this.isCreateModalOpen = true;
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
                    title: 'Dates invalides',
                    message: 'La date de début ne peut pas être après la date de fin.',
                    confirmText: 'Corriger'
                });
                return;
            }
        }

        this.concoursService.createConcours(this.newConcours).subscribe({
            next: (created) => {
                this.closeCreateModal();
                this.loadConcours(); // Refresh list to get proper pagination
                this.newConcours = { titre: '', annee: new Date().getFullYear(), type: 'National', dateDebut: '', dateFin: '' };
                this.showAlert({
                    type: 'success',
                    title: 'Créé !',
                    message: 'Le concours a été créé avec succès.',
                    confirmText: 'Super'
                });
            },
            error: (err) => {
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
                    title: 'Erreur',
                    message: msg,
                    confirmText: 'Fermer'
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
                    title: 'Dates invalides',
                    message: 'La date de début ne peut pas être après la date de fin.',
                    confirmText: 'Corriger'
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
                    title: 'Modifié !',
                    message: 'Le concours a été mis à jour avec succès.',
                    confirmText: 'Génial'
                });
            },
            error: (err) => {
                let msg = 'Impossible de modifier ce concours.';
                if (err.status === 409) {
                    msg = 'Un concours avec ces informations existe déjà.';
                }
                this.showAlert({
                    type: 'error',
                    title: 'Erreur',
                    message: msg,
                    confirmText: 'Fermer'
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
            title: 'Confirmer la suppression',
            message: 'Êtes-vous sûr de vouloir supprimer ce concours ? Cette action est une "suppression logique".',
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            showCancel: true,
            selectedItem: concours ? (concours.titre || '') : '',
            action: () => {
                this.concoursService.deleteConcours(id).subscribe({
                    next: () => {
                        this.loadConcours();
                        setTimeout(() => {
                            this.showAlert({
                                type: 'success',
                                title: 'Supprimé !',
                                message: 'Le concours a été supprimé.',
                                confirmText: 'OK',
                                selectedItem: ''
                            });
                        }, 300);
                    },
                    error: () => {
                        this.showAlert({
                            type: 'error',
                            title: 'Erreur',
                            message: 'La suppression a échoué.',
                            confirmText: 'Fermer'
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
