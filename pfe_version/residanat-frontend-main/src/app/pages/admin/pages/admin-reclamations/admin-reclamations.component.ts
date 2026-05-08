import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReclamationAdminService } from '../../../../core/services/reclamation-admin.service';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import Swal from 'sweetalert2';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

export interface EnrichedReclamation {
  id: number;
  candidatId: number;
  candidateFullName: string;
  candidateCin: string;
  candidateEmail: string;
  objet: string;
  description: string;
  categorie: string;
  priorite: string;
  statut: string;
  dateSoumission: string;
  dateTraitement?: string;
  reponseAdmin?: string;
  candidateSpecialite?: string;
  attachmentUrl?: string; // S3 or storage URL
  attachmentName?: string;
  pieceJointe?: string; // Base64 image/pdf data
}

@Component({
  selector: 'app-admin-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-reclamations.component.html',
  styleUrl: './admin-reclamations.component.scss'
})
export class AdminReclamationsComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private translate = inject(TranslateService);
  private adminReclamationService = inject(ReclamationAdminService);
  private concoursService = inject(ConcoursService);
  private langChangeSub?: Subscription;

  reclamations: EnrichedReclamation[] = [];
  selectedReclamation: EnrichedReclamation | null = null;
  isLoading = true;
  isProcessing = false;

  filterStatut = '';
  filterCategorie = '';
  filterConcours = '';
  searchText = '';

  concoursList: Concours[] = [];

  adminResponse = '';
  suggestedResponse = '';

  // --- Custom Dropdown State ---
  isCategoryDropdownOpen = false;
  isStatusDropdownOpen = false;
  isConcoursDropdownOpen = false;

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const targetElement = event.target as HTMLElement;
    if (!targetElement.closest('.custom-dropdown')) {
      this.isCategoryDropdownOpen = false;
      this.isStatusDropdownOpen = false;
      this.isConcoursDropdownOpen = false;
    }
  }

  toggleCategoryDropdown() {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    this.isStatusDropdownOpen = false; // close the other
  }

  toggleStatusDropdown() {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    this.isCategoryDropdownOpen = false;
    this.isConcoursDropdownOpen = false;
  }

  toggleConcoursDropdown() {
    this.isConcoursDropdownOpen = !this.isConcoursDropdownOpen;
    this.isCategoryDropdownOpen = false;
    this.isStatusDropdownOpen = false;
  }

  selectConcours(value: string) {
    this.filterConcours = value;
    this.isConcoursDropdownOpen = false;
    this.loadReclamations();
  }

  selectCategory(value: string) {
    this.filterCategorie = value;
    this.isCategoryDropdownOpen = false;
    this.loadReclamations();
  }

  selectStatus(value: string) {
    this.filterStatut = value;
    this.isStatusDropdownOpen = false;
    this.loadReclamations();
  }

  getCategoryLabel(value: string): string {
    if (!value) return this.translate.instant('ADMIN_RECLAMATIONS.FILTERS.ALL_CATS');
    const key = `RECLAMATIONS.CATEGORIES.${value}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : value;
  }

  getStatusLabel(value: string): string {
    if (!value) return this.translate.instant('ADMIN_RECLAMATIONS.FILTERS.ALL_STATUS');
    const key = `RECLAMATIONS.STATUS.${value}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : value;
  }

  getConcoursLabel(value: string): string {
    if (!value) return this.translate.instant('ADMIN_RECLAMATIONS.FILTERS.ALL_CONCOURS');
    const c = this.concoursList.find(concours => concours.id === value);
    return c ? (c.libelle || c.titre || value) : value;
  }

  getConcoursName(concoursId?: string): string {
    if (!concoursId) return '-';
    const c = this.concoursList.find(conc => conc.id === concoursId);
    return c ? (c.libelle || c.titre || concoursId) : concoursId;
  }

  // --- Attachment Preview State ---
  isPreviewOpen = false;
  previewUrl: SafeResourceUrl | string = '';
  previewType: 'image' | 'pdf' | 'other' = 'other';

  // --- Computed Stats ---
  get totalCount() { return this.reclamations.length; }
  get pendingCount() { return this.reclamations.filter(r => r.statut === 'SOUMISE').length; }
  get inProgressCount() { return this.reclamations.filter(r => r.statut === 'EN_COURS').length; }
  get resolvedCount() { return this.reclamations.filter(r => r.statut.startsWith('CLOTUREE')).length; }

  // --- Client-side filter (search text only, backend handles statut/categorie/concours) ---
  get filteredReclamations(): EnrichedReclamation[] {
    let result = this.reclamations;

    if (this.searchText.trim()) {
      const s = this.searchText.toLowerCase();
      result = result.filter(r =>
        (r.candidateFullName || '').toLowerCase().includes(s) ||
        (r.objet || '').toLowerCase().includes(s) ||
        (r.candidateCin || '').includes(s)
      );
    }

    return result;
  }

  ngOnInit(): void {
    this.loadConcours();
    this.loadReclamations();
  }

  loadConcours(): void {
    this.concoursService.getConcours(0, 100).subscribe({
      next: (res) => this.concoursList = res.content
    });
  }

  loadReclamations(): void {
    this.isLoading = true;
    this.adminReclamationService.getReclamations(
      this.filterStatut || undefined,
      undefined,
      this.filterCategorie || undefined,
      this.filterConcours || undefined
    ).subscribe({
      next: (data: any) => {
        this.reclamations = data;
        
        // Mock data removed to ensure only real data is shown.

        this.reclamations.forEach((rec) => {
          if (rec.pieceJointe || rec.attachmentUrl) return;
        });
        
        this.isLoading = false;
        this.selectedReclamation = null;
      },
      error: () => {
        this.isLoading = false;
        this.reclamations = [];
      }
    });
  }


  selectReclamation(rec: EnrichedReclamation): void {
    this.selectedReclamation = rec;
    this.generateAISuggestion(rec);
    this.adminResponse = ''; // Keep it empty initially as requested
  }

  onPrendreEnCharge(): void {
    if (!this.selectedReclamation) return;
    this.isProcessing = true;
    this.adminReclamationService.prendreEnCharge(this.selectedReclamation.id).subscribe({
      next: (res: any) => {
        this.updateItemInList(res);
        this.selectedReclamation!.statut = 'EN_COURS';
        this.isProcessing = false;
        Swal.fire({ icon: 'success', title: this.translate.instant('ADMIN_RECLAMATIONS.DETAIL.ACTIONS.TAKE_CHARGE'), text: this.translate.instant('ADMIN_RECLAMATIONS.ALERTS.TAKE_CHARGE_SUCCESS'), timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
      },
      error: () => this.isProcessing = false
    });
  }

  onCloturer(statutFinal: string): void {
    if (!this.selectedReclamation || !this.adminResponse.trim()) {
      Swal.fire(this.translate.instant('COMMON.WARNING'), this.translate.instant('ADMIN_RECLAMATIONS.ALERTS.MISSING_RESPONSE'), 'warning');
      return;
    }
    this.isProcessing = true;
    this.adminReclamationService.cloturer(this.selectedReclamation.id, statutFinal, this.adminResponse).subscribe({
      next: (res: any) => {
        this.selectedReclamation!.statut = statutFinal;
        this.selectedReclamation!.reponseAdmin = this.adminResponse;
        this.selectedReclamation!.dateTraitement = new Date().toISOString();
        this.updateItemInList(res);
        this.isProcessing = false;
        Swal.fire({ icon: 'success', title: this.translate.instant('COMMON.SUCCESS'), text: this.translate.instant('ADMIN_RECLAMATIONS.ALERTS.RESOLVE_SUCCESS'), confirmButtonColor: '#3b82f6' });
      },
      error: () => this.isProcessing = false
    });
  }

  updateMetadata(field: 'categorie' | 'priorite', value: string): void {
    if (!this.selectedReclamation) return;
    const payload = { [field]: value };
    this.adminReclamationService.updateMetadata(this.selectedReclamation.id, payload).subscribe({
      next: (res: any) => {
        if (field === 'categorie') this.selectedReclamation!.categorie = value;
        if (field === 'priorite') this.selectedReclamation!.priorite = value;
        this.updateItemInList(res);
        Swal.fire({ icon: 'info', title: this.translate.instant('COMMON.SUCCESS'), timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
      }
    });
  }

  exportData(): void {
    const csv = "data:text/csv;charset=utf-8,"
      + "ID,Candidat,CIN,Objet,Categorie,Priorite,Statut,Date\n"
      + this.filteredReclamations.map(r =>
          `${r.id},"${r.candidateFullName}","${r.candidateCin}","${r.objet}",${r.categorie},${r.priorite},${r.statut},${r.dateSoumission}`
        ).join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `reclamations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Swal.fire({ icon: 'success', title: this.translate.instant('ADMIN_RECLAMATIONS.ALERTS.EXPORT_SUCCESS'), timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
  }

  useSuggestion(): void {
    this.adminResponse = this.suggestedResponse;
  }

  // --- Attachment Preview Actions ---
  openPreview(rec: EnrichedReclamation): void {
    const fileData = rec.pieceJointe || rec.attachmentUrl;
    if (!fileData) return;
    
    // Auto-detect type from name or base64 header
    const fileName = rec.attachmentName || rec.attachmentUrl || '';
    const isPdf = fileName.toLowerCase().endsWith('.pdf') || fileData.startsWith('data:application/pdf');
    
    if (isPdf) {
      this.previewType = 'pdf';
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileData);
    } else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) || fileData.startsWith('data:image/')) {
      this.previewType = 'image';
      this.previewUrl = fileData; // Normal string is fine for img[src]
    } else {
      this.previewType = 'other';
      this.previewUrl = fileData;
    }
    
    this.isPreviewOpen = true;
  }

  closePreview(): void {
    this.isPreviewOpen = false;
    this.previewUrl = '';
  }

  private updateItemInList(res: any): void {
    const idx = this.reclamations.findIndex(r => r.id === res.id);
    if (idx !== -1) {
      this.reclamations[idx] = { ...this.reclamations[idx], ...res };
      if (this.selectedReclamation?.id === res.id) {
        this.selectedReclamation = this.reclamations[idx];
      }
    }
  }

  private generateAISuggestion(rec: EnrichedReclamation): void {
    const name = rec.candidateFullName || 'Candidat';
    const subject = rec.objet || '';
    if (rec.categorie === 'RESULTAT') {
      this.suggestedResponse = this.translate.instant('ADMIN_RECLAMATIONS.AI_REPLIES.RESULTAT', { name, subject });
    } else if (rec.categorie === 'TECHNIQUE') {
      this.suggestedResponse = this.translate.instant('ADMIN_RECLAMATIONS.AI_REPLIES.TECHNIQUE', { name, subject });
    } else {
      this.suggestedResponse = this.translate.instant('ADMIN_RECLAMATIONS.AI_REPLIES.DEFAULT', { name, subject });
    }
  }

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'SOUMISE': return 'badge-new';
      case 'EN_COURS': return 'badge-progress';
      case 'CLOTUREE_ACCEPTEE': return 'badge-success';
      case 'CLOTUREE_REJETEE': return 'badge-danger';
      default: return '';
    }
  }

  getAvatarClass(statut: string): string {
    switch (statut) {
      case 'SOUMISE': return 'avatar-new';
      case 'EN_COURS': return 'avatar-progress';
      case 'CLOTUREE_ACCEPTEE': return 'avatar-done';
      default: return 'avatar-default';
    }
  }

  getTranslatedText(text: string | undefined): string {
    if (!text) return '';
    
    // Always translate French text to the active language if it matches known patterns
    let translated = text;

    const bugFr = "Bug technique sur la plateforme";
    if (translated.includes(bugFr)) translated = translated.replace(bugFr, this.translate.instant('RECLAMATIONS.CATEGORIES.BUG'));
    
    const personalFr = "Erreur sur les données personnelles";
    if (translated.includes(personalFr)) translated = translated.replace(personalFr, this.translate.instant('RECLAMATIONS.CATEGORIES.PERSONAL'));
    
    const scoreFr = "Erreur sur le score ou le classement";
    if (translated.includes(scoreFr)) translated = translated.replace(scoreFr, this.translate.instant('RECLAMATIONS.CATEGORIES.SCORE'));
    
    const eligFr = "Problème d'éligibilité ou de convocation";
    if (translated.includes(eligFr)) translated = translated.replace(eligFr, this.translate.instant('RECLAMATIONS.CATEGORIES.ELIGIBILITY'));
    
    const autreFr = "Autre (précision requise)";
    if (translated.includes(autreFr)) translated = translated.replace(autreFr, this.translate.instant('RECLAMATIONS.CATEGORIES.OTHER'));

    return translated;
  }

  getTranslate(key: string): string {
    if (!key) return '';
    
    // Try Category
    const translatedCat = this.translate.instant(`RECLAMATIONS.CATEGORIES.${key}`);
    if (translatedCat !== `RECLAMATIONS.CATEGORIES.${key}`) return translatedCat;
    
    // Try Status
    const translatedStat = this.translate.instant(`RECLAMATIONS.STATUS.${key}`);
    if (translatedStat !== `RECLAMATIONS.STATUS.${key}`) return translatedStat;

    // Try Priorities
    const translatedPrio = this.translate.instant(`RECLAMATIONS.PRIORITIES.${key}`);
    if (translatedPrio !== `RECLAMATIONS.PRIORITIES.${key}`) return translatedPrio;

    // Try old CATS block if still referenced
    const translatedOldCat = this.translate.instant(`RECLAMATIONS.CATS.${key}`);
    if (translatedOldCat !== `RECLAMATIONS.CATS.${key}`) return translatedOldCat;

    return key;
  }

  private getMockData(): EnrichedReclamation[] {
    return []; // Cleared mock data to enforce real data connection!
  }
}
