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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-admin-candidats',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, TranslateModule],
    templateUrl: './admin-candidats.component.html',
    styleUrl: './admin-candidats.component.scss'
})
export class AdminCandidatsComponent implements OnInit {
    private authService = inject(AuthService);
    private dossierService = inject(DossierService);
    private concoursService = inject(ConcoursService);
    private renderer = inject(Renderer2);
    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private langChangeSub?: Subscription;

    allCandidats: any[] = [];
    filteredCandidats: any[] = [];
    rawUsers: any[] = [];
    rawDossiers: any[] = [];
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
        this.route.queryParams.subscribe(params => {
            if (params['concoursId']) {
                this.selectedConcoursId = params['concoursId'];
            }
        });
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
        this.rawDossiers = dossiers;
        this.rawUsers = users.filter(u => u.role === 'CANDIDAT');
        this.buildCandidatsList();
    }

    buildCandidatsList() {
        this.allCandidats = [];
        
        for (const user of this.rawUsers) {
            const userDossiers = this.rawDossiers.filter(d => d.candidatId === user.id);
            
            if (this.selectedConcoursId === 'all') {
                // Afficher seulement les dossiers réels existants
                for (const dossier of userDossiers) {
                    this.allCandidats.push(this.mapUserToCandidat(user, dossier, dossier.concoursId));
                }
            } else {
                const dossierForConcours = userDossiers.find(d => d.concoursId === this.selectedConcoursId);
                // Afficher le candidat seulement s'il a un dossier pour ce concours spécifique
                if (dossierForConcours) {
                    this.allCandidats.push(this.mapUserToCandidat(user, dossierForConcours, this.selectedConcoursId));
                }
            }
        }

        this.calculateStats();
        this.applyFilters();
        this.pruneSelection();

        // Refresh selected candidate if modal is open
        if (this.showModal && this.selectedCandidat) {
            this.selectedCandidat = this.allCandidats.find(c => c.realId === this.selectedCandidat.realId);
        }
    }

    mapUserToCandidat(user: any, dossier: any, concoursIdContext: string | null) {
        return {
            id: `CND-${user.id.toString().padStart(3, '0')}`,
            realId: user.id,
            dossierId: dossier ? dossier.id : null,
            concoursId: concoursIdContext,
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
            anomalies: dossier && dossier.evaluationIA ? dossier.evaluationIA.anomalies : null,
            verified: dossier && dossier.evaluationIA ? dossier.evaluationIA.verifie : false,
            dateInscription: dossier ? dossier.dateSoumission : null,
            initials: this.getInitials(user.nom, user.prenom),
            documents: dossier ? dossier.documents : []
        };
    }

    getInitials(nom: string, prenom: string): string {
        if (!nom && !prenom) return 'U';
        const n = nom ? nom.charAt(0).toUpperCase() : '';
        const p = prenom ? prenom.charAt(0).toUpperCase() : '';
        return n + p;
    }

    calculateStats() {
        const pool = this.allCandidats;
        this.stats.total = pool.length;
        this.stats.valides = pool.filter(c => c.statut === 'VALIDE').length;
        this.stats.enAttente = pool.filter(c => c.statut === 'EN_ATTENTE').length;
        this.stats.rejetes = pool.filter(c => c.statut === 'REJETE').length;
    }

    applyFilters() {
        this.filteredCandidats = this.allCandidats.filter(c => {
            const matchSearch = (c.nom + ' ' + c.prenom + ' ' + c.id + ' ' + (c.cin || '')).toLowerCase().includes(this.searchTerm.toLowerCase());
            const matchStatus = this.statusFilter === 'all' || c.statut === this.statusFilter;
            return matchSearch && matchStatus;
        });
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
        if (!candidat?.dossierId) return this.translate.instant('ADMIN_CANDIDATS.STATUS.SANS_DOSSIER');
        if (candidat?.statut === 'VALIDE') return this.translate.instant('ADMIN_CANDIDATS.STATUS.DEJA_VALIDE');
        if (candidat?.statut === 'REJETE') return this.translate.instant('ADMIN_CANDIDATS.STATUS.REJETE');
        return this.translate.instant('ADMIN_CANDIDATS.STATUS.NON_COMMENCE');
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
            Swal.fire('Info', this.translate.instant('ADMIN_CANDIDATS.ALERTS.NO_SELECTION'), 'info');
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
            Swal.fire('Info', this.translate.instant('ADMIN_CANDIDATS.ALERTS.NO_SELECTION'), 'info');
            return;
        }

        Swal.fire({
            title: this.translate.instant('ADMIN_CANDIDATS.ALERTS.BULK_CONFIRM_TITLE'),
            text: this.translate.instant('ADMIN_CANDIDATS.ALERTS.BULK_CONFIRM_DESC', { count: targets.length }),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: this.translate.instant('COMMON.YES'),
            cancelButtonText: this.translate.instant('COMMON.CANCEL'),
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
                        title: this.translate.instant('COMMON.SUCCESS'),
                        text: this.translate.instant('ADMIN_CANDIDATS.ALERTS.BULK_SUCCESS', { success: successCount, failed: failedCount }),
                        icon: failedCount > 0 ? 'warning' : 'success',
                        confirmButtonColor: '#00b64f'
                    });

                    this.loadData();
                },
                error: () => {
                    this.isBulkValidating = false;
                    Swal.fire(this.translate.instant('COMMON.ERROR'), this.translate.instant('COMMON.ERROR_DESC'), 'error');
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
            Swal.fire(this.translate.instant('COMMON.ERROR'), this.translate.instant('ADMIN_CANDIDATS.STATUS.SANS_DOSSIER'), 'error');
            return;
        }

        this.dossierService.updateStatut(candidat.dossierId, nouveauStatut as any).subscribe({
            next: () => {
                Swal.fire({
                    title: this.translate.instant('COMMON.SUCCESS'),
                    text: this.translate.instant('ADMIN_CANDIDATS.ALERTS.SINGLE_SUCCESS'),
                    icon: 'success',
                    confirmButtonColor: nouveauStatut === 'VALIDE' ? '#00b64f' : '#f26464'
                });
                this.loadData();
            },
            error: (err) => Swal.fire(this.translate.instant('COMMON.ERROR'), this.translate.instant('COMMON.ERROR_DESC'), 'error')
        });
    }

    getStatutLabel(statut: string): string {
        switch (statut) {
            case 'VALIDE': return this.translate.instant('ADMIN_CANDIDATS.STATUS.VALIDE');
            case 'EN_ATTENTE': return this.translate.instant('ADMIN_CANDIDATS.STATUS.EN_ATTENTE');
            case 'REJETE': return this.translate.instant('ADMIN_CANDIDATS.STATUS.REJETE');
            case 'BROUILLON': return this.translate.instant('ADMIN_CANDIDATS.STATUS.NON_COMMENCE');
            default: return this.translate.instant('ADMIN_CANDIDATS.STATUS.NON_COMMENCE');
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
            case 'VALIDE': return this.translate.instant('ADMIN_CANDIDATS.STATUS.VALIDE');
            case 'EN_ATTENTE': return this.translate.instant('ADMIN_CANDIDATS.STATUS.EN_ATTENTE');
            case 'REJETE': return this.translate.instant('ADMIN_CANDIDATS.STATUS.REJETE');
            default: return this.translate.instant('ADMIN_CANDIDATS.FILTERS.ALL_STATUS');
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
        this.buildCandidatsList();
    }

    getConcoursFilterLabel(): string {
        if (this.selectedConcoursId === 'all') return this.translate.instant('ADMIN_CANDIDATS.FILTERS.ALL_CONCOURS');
        const c = this.concoursList.find(concours => concours.id === this.selectedConcoursId);
        return c ? (c.libelle || c.titre || this.translate.instant('COMMON.UNKNOWN')) : this.translate.instant('COMMON.UNKNOWN');
    }

    getConcoursName(concoursId: string | null): string {
        if (!concoursId) return this.translate.instant('ADMIN_CANDIDATS.STATUS.SANS_DOSSIER');
        const c = this.concoursList.find(concours => concours.id === concoursId);
        return c ? (c.libelle || c.titre || 'Concours') : '...';
    }

    getStatutClass(statut: string): string {
        switch (statut) {
            case 'VALIDE': return 'statut-valide';
            case 'EN_ATTENTE': return 'statut-attente';
            case 'REJETE': return 'statut-rejete';
            case 'BROUILLON': return 'statut-none';
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

    getUploadUrl(chemin: string): string {
        if (!chemin) return '#';
        const base = window.location.origin.replace(':4200', ':8080');
        return `${base}/api/dossiers/uploads/${chemin}`;
    }

    showAnomalyWarning(anomalies: string, event: Event) {
        event.stopPropagation();
        
        let validLines = anomalies.split('\n')
            .map(a => a.trim())
            .filter(a => a.length > 0 && !a.toLowerCase().includes('aucune anomalie'));

        let formattedAnomalies = validLines.join('<br/>');
        if (validLines.length > 1 || validLines.some(a => a.includes('- '))) {
            const listItems = validLines.map(a => `<li>${a}</li>`).join('');
            formattedAnomalies = `<ul style="text-align: left; margin: 10px 0; color: #78350f; font-size: 0.9rem; padding-left: 20px;">${listItems}</ul>`;
        }

        Swal.fire({
            title: this.translate.instant('ADMIN_CANDIDATS.ALERTS.ANOMALIES_TITLE'),
            html: `
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
                    ${formattedAnomalies}
                </div>
            `,
            icon: 'warning',
            iconColor: '#ef4444',
            confirmButtonText: this.translate.instant('COMMON.CLOSE'),
            confirmButtonColor: '#ef4444',
            customClass: {
                popup: 'anomaly-swal-popup'
            }
        });
    }

    closeModal() {
        this.showModal = false;
        this.selectedCandidat = null;
    }

    exportToExcel() {
        if (this.filteredCandidats.length === 0) {
            Swal.fire('Info', this.translate.instant('ADMIN_CANDIDATS.ALERTS.NO_DATA'), 'info');
            return;
        }

        const data = this.filteredCandidats.map(c => ({
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.ID')]: c.id,
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.NOM')]: c.nom,
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.PRENOM')]: c.prenom,
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.CONCOURS')]: this.getConcoursName(c.concoursId),
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.EMAIL')]: c.email,
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.CIN')]: c.cin,
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.PHONE')]: c.telephone,
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.NATIONALITY')]: c.nationalite,
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.FACULTY')]: c.faculte,
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.STATUS')]: this.getStatutLabel(c.statut),
            [this.translate.instant('ADMIN_CANDIDATS.EXCEL.HEADERS.SCORE')]: c.scoreIA
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
            ? `${this.translate.instant('ADMIN_CANDIDATS.EXCEL.FILENAME')}_tous.xlsx`
            : `${this.translate.instant('ADMIN_CANDIDATS.EXCEL.FILENAME')}_${this.getConcoursName(this.selectedConcoursId).replace(/\s+/g, '_').toLowerCase()}.xlsx`;

        XLSX.writeFile(workbook, fileName);
    }
}
