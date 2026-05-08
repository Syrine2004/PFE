import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import { ResultatsService } from '../../../../core/services/resultats.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

interface LatestImportDetails {
  fileName: string;
  importedAt: string;
  importedCount: number;
}

@Component({
  selector: 'app-import-resultats',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './import-resultats.component.html',
  styleUrl: './import-resultats.component.scss'
})
export class ImportResultatsComponent implements OnInit {
  private http = inject(HttpClient);
  private concoursService = inject(ConcoursService);
  private resultatsService = inject(ResultatsService);
  private translate = inject(TranslateService);
  private langChangeSub?: Subscription;

  isDropdownOpen = false;
  showResultsModal = false;

  @HostListener('document:click')
  onDocumentClick() {
    this.isDropdownOpen = false;
  }

  get selectedConcoursLabel(): string {
    const fallback = this.translate.instant('IMPORT.SELECT_CONCOURS');
    if (!this.selectedConcoursId) return fallback;
    const c = this.concoursOptions.find(opt => opt.id === this.selectedConcoursId);
    return c ? `${c.libelle || c.titre} - ${c.annee}` : fallback;
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectConcours(id: string) {
    this.selectedConcoursId = id;
    this.isDropdownOpen = false;
    this.onConcoursChange();
  }
  
  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  concoursOptions: Concours[] = [];
  selectedConcoursId = '';
  correctionMode = false;
  totalResultats = 0;
  totalImports = 0;
  latestImportDetails: LatestImportDetails | null = null;

  resultsList: any[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  ngOnInit(): void {
    this.loadConcoursOptions();
  }

  loadConcoursOptions() {
    this.concoursService.getConcours(0, 100).subscribe({
      next: (response) => {
        this.concoursOptions = response?.content ?? [];
        if (!this.selectedConcoursId && this.concoursOptions.length > 0) {
          this.selectedConcoursId = this.concoursOptions[0].id || '';
        }
        this.loadImportStats();
        this.loadResultsList();
      }
    });
  }

  onConcoursChange() {
    this.correctionMode = false;
    this.currentPage = 0;
    this.loadImportStats();
    this.loadResultsList();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  resetFile() {
    this.selectedFile = null;
    this.uploadProgress = 0;
  }

  uploadFile() {
    if (!this.selectedFile || !this.selectedConcoursId) return;

    this.isUploading = true;
    this.uploadProgress = 10;
    
    // Simulate/Track progress if the service doesn't support it directly
    const interval = setInterval(() => {
      if (this.uploadProgress < 90) this.uploadProgress += 5;
    }, 400);

    this.resultatsService.importerFichierExcel(this.selectedFile, this.selectedConcoursId, this.correctionMode).subscribe({
      next: (res: any) => {
        clearInterval(interval);
        this.uploadProgress = 100;
        setTimeout(() => {
          this.isUploading = false;
          this.loadImportStats();
          this.loadResultsList();
          Swal.fire({
            title: this.translate.instant('COMMON.SUCCESS'),
            text: res.message || this.translate.instant('IMPORT.ALERTS.UPLOAD_SUCCESS', { count: this.totalResultats }),
            icon: 'success',
            confirmButtonColor: '#0ea5e9'
          });
          this.resetFile();
        }, 500);
      },
      error: (err) => {
        clearInterval(interval);
        this.isUploading = false;
        Swal.fire({
          title: this.translate.instant('COMMON.ERROR'),
          text: err.error?.message || this.translate.instant('COMMON.ERROR_DESC'),
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  loadImportStats() {
    if (!this.selectedConcoursId) return;
    this.resultatsService.getStats(this.selectedConcoursId).subscribe({
      next: (stats) => {
        this.totalResultats = stats?.totalResults ?? 0;
        this.totalImports = stats?.totalImports ?? 0;
        const latest = stats?.latestImport;
        this.latestImportDetails = latest?.fileName ? {
          fileName: latest.fileName,
          importedAt: latest.importedAt ?? '',
          importedCount: latest.importedCount ?? 0
        } : null;
      }
    });
  }

  loadResultsList() {
    if (!this.selectedConcoursId) return;
    this.resultatsService.getResultatsList(this.selectedConcoursId, this.currentPage, this.pageSize).subscribe({
      next: (data) => {
        this.resultsList = data.content;
        this.totalElements = data.totalElements;
        this.totalPages = data.totalPages;
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadResultsList();
  }

  onViderResultats() {
    if (!this.selectedConcoursId) return;
    Swal.fire({
      title: this.translate.instant('IMPORT.ALERTS.CLEAR_CONFIRM_TITLE'),
      text: this.translate.instant('IMPORT.ALERTS.CLEAR_CONFIRM'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.translate.instant('COMMON.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.resultatsService.viderResultats(this.selectedConcoursId).subscribe({
          next: () => {
             this.loadImportStats();
             this.loadResultsList();
             Swal.fire({
               title: this.translate.instant('COMMON.SUCCESS'),
               text: this.translate.instant('IMPORT.ALERTS.CLEAR_SUCCESS'),
               icon: 'success',
               confirmButtonColor: '#0ea5e9'
             });
          }
        });
      }
    });
  }

  publierResultats() {
    if (!this.selectedConcoursId) return;
    Swal.fire({
      title: this.translate.instant('IMPORT.ALERTS.PUBLISH_CONFIRM_TITLE'),
      html: this.translate.instant('IMPORT.ALERTS.PUBLISH_CONFIRM_HTML', { count: this.totalResultats }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.translate.instant('COMMON.VALIDATE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL'),
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.resultatsService.publierResultats(this.selectedConcoursId).subscribe({
          next: () => Swal.fire({
            title: this.translate.instant('COMMON.SUCCESS'),
            text: this.translate.instant('IMPORT.ALERTS.PUBLISH_SUCCESS'),
            icon: 'success',
            confirmButtonColor: '#7c3aed'
          }),
          error: (err) => Swal.fire({
            title: this.translate.instant('COMMON.ERROR'),
            text: err.error?.message || this.translate.instant('COMMON.ERROR_DESC'),
            icon: 'error',
            confirmButtonColor: '#ef4444'
          })
        });
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    const locale = this.translate.currentLang === 'ar' ? 'ar-SA' : 'fr-FR';
    return date.toLocaleString(locale);
  }
}
