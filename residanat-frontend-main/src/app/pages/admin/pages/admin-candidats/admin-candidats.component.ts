import { Component, OnInit, inject, HostListener, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { DossierService } from '../../../../core/services/dossier.service';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import Swal from 'sweetalert2';

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

        // CSV Header
        const headers = ['ID', 'Nom', 'Prénom', 'Concours', 'Email', 'CIN', 'Téléphone', 'Nationalité', 'Faculté', 'Statut', 'Score IA %'];

        // CSV Rows
        const rows = this.filteredCandidats.map(c => [
            c.id,
            c.nom,
            c.prenom,
            this.getConcoursName(c.concoursId),
            c.email,
            c.cin,
            c.telephone,
            c.nationalite,
            c.faculte,
            this.getStatutLabel(c.statut),
            c.scoreIA
        ]);

        // Join with semicolon for Excel French/International compatibility
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        // Add BOM for UTF-8 (Excel requires this for accents)
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const fileName = this.selectedConcoursId === 'all'
            ? 'liste_candidats_tous.csv'
            : `liste_candidats_${this.getConcoursName(this.selectedConcoursId).replace(/\s+/g, '_').toLowerCase()}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
