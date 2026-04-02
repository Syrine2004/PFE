import { Component, OnInit, inject, HostListener, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { DossierService } from '../../../../core/services/dossier.service';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-admin-candidats',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './admin-candidats.component.html',
    styleUrl: './admin-candidats.component.scss'
})
export class AdminCandidatsComponent implements OnInit {
    private authService = inject(AuthService);
    private dossierService = inject(DossierService);
    private concoursService = inject(ConcoursService);
    private renderer = inject(Renderer2);

    allCandidats: any[] = [];
    filteredCandidats: any[] = [];
    concoursList: Concours[] = [];
    searchTerm: string = '';
    statusFilter: string = 'all';
    selectedConcoursId: string = 'all';
    openDropdownId: string | null = null;
    isFilterDropdownOpen: boolean = false;
    isConcoursDropdownOpen: boolean = false;
    selectedCandidateIds = new Set<number>();
    isBulkValidating = false;

    // Modal state
    showModal = false;
    selectedCandidat: any = null;

    stats = {
        total: 0,
        valides: 0,
        enAttente: 0,
        rejetes: 0
    };

    ngOnInit() {
        this.loadConcours();
        this.loadData();
    }

    loadConcours() {
        // Fetch a large number to get "all" relevant concours for filtering
        this.concoursService.getConcours(0, 50).subscribe({
            next: (res) => {
                this.concoursList = res.content;
            },
            error: (err) => console.error('Erreur chargement concours', err)
        });
    }

    loadData() {
        this.dossierService.getAllDossiers().subscribe({
            next: (dossiers: any[]) => {
                this.authService.getUsers().subscribe({
                    next: (users: any[]) => {
                        this.mergeData(dossiers, users);
                    },
                    error: (err: any) => console.error('Erreur chargement utilisateurs', err)
                });
            },
            error: (err: any) => console.error('Erreur chargement dossiers', err)
        });
    }

    mergeData(dossiers: any[], users: any[]) {
        this.allCandidats = users
            .filter(u => u.role === 'CANDIDAT')
            .map(user => {
                const dossier = dossiers.find(d => d.candidatId === user.id);
                return {
                    id: `CND-${user.id.toString().padStart(3, '0')}`,
                    realId: user.id,
                    dossierId: dossier ? dossier.id : null,
                    concoursId: dossier ? dossier.concoursId : null,
                    nom: user.nom,
                    prenom: user.prenom,
                    email: user.email,
                    cin: user.cin,
                    telephone: user.telephone,
                    faculte: user.faculte || 'Non spécifiée',
                    nationalite: user.nationalite || 'Tunisienne',
                    statut: dossier ? dossier.statut : 'NON_COMMENCE',
                    scoreIA: dossier && dossier.evaluationIA ? dossier.evaluationIA.score : 0,
                    scoreCin: dossier && dossier.evaluationIA ? dossier.evaluationIA.scoreCin : null,
                    scoreDiplome: dossier && dossier.evaluationIA ? dossier.evaluationIA.scoreDiplome : null,
                    verified: dossier && dossier.evaluationIA ? dossier.evaluationIA.verifie : false,
                    dateInscription: dossier ? dossier.dateSoumission : null,
                    initials: this.getInitials(user.nom, user.prenom),
                    documents: dossier ? dossier.documents : []
                };
            });

        this.calculateStats();
        this.applyFilters();
        this.pruneSelection();

        // Refresh selected candidate if modal is open
        if (this.showModal && this.selectedCandidat) {
            this.selectedCandidat = this.allCandidats.find(c => c.realId === this.selectedCandidat.realId);
        }
    }

    getInitials(nom: string, prenom: string): string {
        const n = nom ? nom.charAt(0).toUpperCase() : '';
        const p = prenom ? prenom.charAt(0).toUpperCase() : '';
        return n + p;
    }

    calculateStats() {
        // Stats are reflecting the selected concours if any
        const pool = this.selectedConcoursId === 'all'
            ? this.allCandidats
            : this.allCandidats.filter(c => c.concoursId === this.selectedConcoursId);

        this.stats.total = pool.length;
        this.stats.valides = pool.filter(c => c.statut === 'VALIDE').length;
        this.stats.enAttente = pool.filter(c => c.statut === 'EN_ATTENTE').length;
        this.stats.rejetes = pool.filter(c => c.statut === 'REJETE').length;
    }

    applyFilters() {
        this.filteredCandidats = this.allCandidats.filter(c => {
            const matchSearch = (c.nom + ' ' + c.prenom + ' ' + c.id + ' ' + (c.cin || '')).toLowerCase().includes(this.searchTerm.toLowerCase());
            const matchStatus = this.statusFilter === 'all' || c.statut === this.statusFilter;
            const matchConcours = this.selectedConcoursId === 'all' || c.concoursId === this.selectedConcoursId;
            return matchSearch && matchStatus && matchConcours;
        });
        this.calculateStats();
    }

    private pruneSelection() {
        const validIds = new Set(
            this.allCandidats
                .filter(c => this.canSelectCandidate(c))
                .map(c => c.realId)
        );

        this.selectedCandidateIds = new Set(
            Array.from(this.selectedCandidateIds).filter(id => validIds.has(id))
        );
    }

    private getBulkEligibleCandidates(): any[] {
        return this.filteredCandidats.filter(c =>
            Number(c.scoreIA || 0) === 100 &&
            this.canSelectCandidate(c)
        );
    }

    getBulkEligibleCount(): number {
        return this.getBulkEligibleCandidates().length;
    }

    canSelectCandidate(candidat: any): boolean {
        return candidat?.statut === 'EN_ATTENTE' && !!candidat?.dossierId;
    }

    getSelectionHint(candidat: any): string {
        if (!candidat?.dossierId) return 'Sans dossier';
        if (candidat?.statut === 'VALIDE') return 'Déjà validé';
        if (candidat?.statut === 'REJETE') return 'Rejeté';
        return 'Non sélectionnable';
    }

    getSelectedCount(): number {
        return this.selectedCandidateIds.size;
    }

    isSelected(candidat: any): boolean {
        return this.selectedCandidateIds.has(candidat.realId);
    }

    toggleCandidateSelection(candidat: any, event: Event) {
        if (!this.canSelectCandidate(candidat)) return;
        const input = event.target as HTMLInputElement;
        if (!input) return;

        if (input.checked) {
            this.selectedCandidateIds.add(candidat.realId);
        } else {
            this.selectedCandidateIds.delete(candidat.realId);
        }
    }

    selectScore100Candidates() {
        const eligible = this.getBulkEligibleCandidates();
        this.selectedCandidateIds = new Set(eligible.map(c => c.realId));

        if (eligible.length === 0) {
            Swal.fire('Info', 'Aucun candidat à 100% en attente à sélectionner.', 'info');
        }
    }

    clearSelection() {
        this.selectedCandidateIds.clear();
    }

    bulkValidateSelected() {
        if (this.isBulkValidating) {
            return;
        }

        const targets = this.allCandidats.filter(c =>
            this.selectedCandidateIds.has(c.realId) &&
            this.canSelectCandidate(c)
        );

        if (targets.length === 0) {
            Swal.fire('Info', 'Aucun dossier valide à traiter dans la sélection.', 'info');
            return;
        }

        Swal.fire({
            title: 'Valider la sélection ?',
            text: `${targets.length} dossier(s) seront validés.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Oui, valider',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#00b64f'
        }).then(result => {
            if (!result.isConfirmed) return;

            this.isBulkValidating = true;
            const requests = targets.map(c =>
                this.dossierService.updateStatut(c.dossierId, 'VALIDE' as any).pipe(
                    map(() => ({ ok: true, id: c.realId })),
                    catchError(() => of({ ok: false, id: c.realId }))
                )
            );

            forkJoin(requests).subscribe({
                next: (results) => {
                    const successCount = results.filter(r => r.ok).length;
                    const failedCount = results.length - successCount;

                    this.isBulkValidating = false;
                    this.clearSelection();

                    Swal.fire({
                        title: 'Traitement terminé',
                        text: `${successCount} validé(s), ${failedCount} échec(s).`,
                        icon: failedCount > 0 ? 'warning' : 'success',
                        confirmButtonColor: '#00b64f'
                    });

                    this.loadData();
                },
                error: () => {
                    this.isBulkValidating = false;
                    Swal.fire('Erreur', 'Impossible de valider la sélection.', 'error');
                }
            });
        });
    }

    updateStatut(candidat: any, nouveauStatut: string) {
        // Blur active element to prevent aria-hidden focus warnings when Swal opens
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        // Close modal if open to prevent it from sitting under Swal
        this.closeModal();

        if (!candidat.dossierId) {
            Swal.fire('Erreur', 'Aucun dossier n\'a été créé pour ce candidat.', 'error');
            return;
        }

        this.dossierService.updateStatut(candidat.dossierId, nouveauStatut as any).subscribe({
            next: () => {
                Swal.fire({
                    title: 'Succès',
                    text: `Le dossier a été ${nouveauStatut === 'VALIDE' ? 'validé' : 'rejeté'} avec succès.`,
                    icon: 'success',
                    confirmButtonColor: nouveauStatut === 'VALIDE' ? '#00b64f' : '#f26464'
                });
                this.loadData();
            },
            error: (err) => Swal.fire('Erreur', 'Impossible de mettre à jour le statut.', 'error')
        });
    }

    getStatutLabel(statut: string): string {
        switch (statut) {
            case 'VALIDE': return 'Valide';
            case 'EN_ATTENTE': return 'En attente';
            case 'REJETE': return 'Rejeté';
            default: return 'Non commencé';
        }
    }

    toggleFilterDropdown(event: Event) {
        event.stopPropagation();
        this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
        this.openDropdownId = null;
    }

    selectStatusFilter(status: string) {
        this.statusFilter = status;
        this.isFilterDropdownOpen = false;
        this.applyFilters();
    }

    getFilterLabel(): string {
        switch (this.statusFilter) {
            case 'VALIDE': return 'Valide';
            case 'EN_ATTENTE': return 'En attente';
            case 'REJETE': return 'Rejeté';
            default: return 'Tous les statuts';
        }
    }

    toggleConcoursDropdown(event: Event) {
        event.stopPropagation();
        this.isConcoursDropdownOpen = !this.isConcoursDropdownOpen;
        this.isFilterDropdownOpen = false;
        this.openDropdownId = null;
    }

    selectConcoursFilter(concoursId: string) {
        this.selectedConcoursId = concoursId;
        this.isConcoursDropdownOpen = false;
        this.applyFilters();
    }

    getConcoursFilterLabel(): string {
        if (this.selectedConcoursId === 'all') return 'Tous les concours';
        const c = this.concoursList.find(concours => concours.id === this.selectedConcoursId);
        return c ? (c.libelle || c.titre || 'Concours sans nom') : 'Concours inconnu';
    }

    getConcoursName(concoursId: string | null): string {
        if (!concoursId) return 'Non inscrit';
        const c = this.concoursList.find(concours => concours.id === concoursId);
        return c ? (c.libelle || c.titre || 'Concours') : '...';
    }

    getStatutClass(statut: string): string {
        switch (statut) {
            case 'VALIDE': return 'statut-valide';
            case 'EN_ATTENTE': return 'statut-attente';
            case 'REJETE': return 'statut-rejete';
            default: return 'statut-none';
        }
    }

    toggleDropdown(id: string, event: Event) {
        event.stopPropagation();
        this.openDropdownId = this.openDropdownId === id ? null : id;
    }

    @HostListener('document:click')
    closeDropdown() {
        this.openDropdownId = null;
        this.isFilterDropdownOpen = false;
        this.isConcoursDropdownOpen = false;
    }

    openDossierModal(candidat: any) {
        this.selectedCandidat = candidat;
        this.showModal = true;
        this.openDropdownId = null;
    }

    closeModal() {
        this.showModal = false;
        this.selectedCandidat = null;
    }

    exportToExcel() {
        if (this.filteredCandidats.length === 0) {
            Swal.fire('Info', 'Aucune donnée à exporter.', 'info');
            return;
        }

        const data = this.filteredCandidats.map(c => ({
            'ID': c.id,
            'Nom': c.nom,
            'Prénom': c.prenom,
            'Concours': this.getConcoursName(c.concoursId),
            'Email': c.email,
            'CIN': c.cin,
            'Téléphone': c.telephone,
            'Nationalité': c.nationalite,
            'Faculté': c.faculte,
            'Statut': this.getStatutLabel(c.statut),
            'Score IA %': c.scoreIA
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 12 },
            { wch: 18 },
            { wch: 18 },
            { wch: 24 },
            { wch: 30 },
            { wch: 16 },
            { wch: 18 },
            { wch: 16 },
            { wch: 22 },
            { wch: 14 },
            { wch: 12 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidats');

        const fileName = this.selectedConcoursId === 'all'
            ? 'liste_candidats_tous.xlsx'
            : `liste_candidats_${this.getConcoursName(this.selectedConcoursId).replace(/\s+/g, '_').toLowerCase()}.xlsx`;

        XLSX.writeFile(workbook, fileName);
    }
}
