import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

interface ImportTrace {
  name: string;
  sizeBytes: number;
  uploadedAt: string;
  importedCount: number;
  concoursId?: string;
  concoursLabel?: string;
}

interface ImportStatsResponse {
  totalAffectations: number;
  totalImports: number;
  latestImport?: {
    fileName?: string;
    name?: string;
    importedAt?: string;
    importedCount?: number;
    concoursId?: string;
  };
}

interface LatestImportDetails {
  fileName: string;
  name?: string;
  importedAt: string;
  importedCount: number;
  concoursId?: string;
}

interface ExcelPreviewResponse {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
}

@Component({
  selector: 'app-import-ministere',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './import-ministere.component.html',
  styleUrl: './import-ministere.component.scss'
})
export class ImportMinistereComponent implements OnInit {
  private http = inject(HttpClient);
  private concoursService = inject(ConcoursService);
  private translate = inject(TranslateService);
  private langChangeSub?: Subscription;

  isDropdownOpen = false;

  @HostListener('document:click')
  onDocumentClick() {
    this.isDropdownOpen = false;
  }

  get selectedConcoursLabel(): string {
    const fallback = this.translate.instant('IMPORT.SELECT_CONCOURS');
    if (!this.selectedConcoursId) return fallback;
    const c = this.concoursOptions.find(opt => opt.id === this.selectedConcoursId);
    return c ? `${c.libelle || c.titre || 'Concours'} - ${c.annee}` : fallback;
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
  totalAffectations = 0;
  totalImports = 0;
  latestImportLabel = '';
  latestImportDetails: LatestImportDetails | null = null;
  previewOpen = false;
  previewLoading = false;
  previewFileName = '';
  previewSheetName = '';
  previewHeaders: string[] = [];
  previewRows: string[][] = [];
  showDataModal = false;

  dataList: any[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  private baseHost = window.location.hostname === 'localhost' ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.hostname}`;
  private apiUrl = `${this.baseHost}/api/convocations/admin/affectations/import`;
  private statsUrl = `${this.baseHost}/api/convocations/admin/affectations/imports/stats`;
  private traceUrl = `${this.baseHost}/api/convocations/admin/affectations/imports/trace`;
  private readonly uploadHistoryStorageKey = 'ministere_upload_history';

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
      },
      error: () => {
        this.concoursOptions = [];
        this.loadImportStats();
      }
    });
  }

  onConcoursChange() {
    this.correctionMode = false;
    this.currentPage = 0;
    this.loadImportStats();
    this.loadDataList();
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
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('concoursId', this.selectedConcoursId);
    formData.append('forceReimport', this.correctionMode ? 'true' : 'false');

    this.http.post(this.apiUrl, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            this.uploadProgress = Math.round(100 * event.loaded / event.total);
          }
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.loadImportStats();
          this.loadDataList();
          Swal.fire({
            title: this.translate.instant('COMMON.SUCCESS'),
            text: this.translate.instant('IMPORT.ALERTS.UPLOAD_SUCCESS', { count: event.body?.count ?? 0 }),
            icon: 'success',
            confirmButtonColor: '#2389a8'
          });
          this.resetFile();
        }
      },
      error: (err) => {
        this.isUploading = false;
        if (err?.status === 409) {
          Swal.fire({
            title: this.translate.instant('IMPORT.ALERTS.LOCKED_ERROR'),
            text: err.error?.message || this.translate.instant('IMPORT.ALERTS.LOCKED_ERROR'),
            icon: 'warning',
            confirmButtonColor: '#2389a8'
          });
          return;
        }
        Swal.fire({
          title: this.translate.instant('COMMON.ERROR'),
          text: err.error?.error || err.error?.message || this.translate.instant('COMMON.ERROR_DESC'),
          icon: 'error',
          confirmButtonColor: '#2389a8'
        });
      }
    });
  }

  appendUploadedFile(file: File | null, importedCount: number, concoursId: string) {
    // This is now handled after a successful upload
  }

  loadImportStats() {
    const params: any = {};
    if (this.selectedConcoursId) {
      params.concoursId = this.selectedConcoursId;
    }

    this.http.get<ImportStatsResponse>(this.statsUrl, { params }).subscribe({
      next: (stats) => {
        this.totalAffectations = stats?.totalAffectations ?? 0;
        this.totalImports = stats?.totalImports ?? 0;
        const latest = stats?.latestImport;
        if (latest && (latest.name || latest.fileName)) {
          let cleanName = latest.name;
          if (!cleanName && latest.fileName) {
            const parts = latest.fileName.split('__');
            cleanName = parts[parts.length - 1]; // Brute force last part
          }
          
          this.latestImportDetails = {
            fileName: latest.fileName ?? '',
            name: cleanName,
            importedAt: latest.importedAt ?? '',
            importedCount: latest.importedCount ?? 0,
            concoursId: latest.concoursId
          };
          this.latestImportLabel = this.translate.instant('IMPORT.STATS.LATEST', { 
            name: cleanName, 
            count: latest.importedCount ?? 0, 
            date: this.formatDate(latest.importedAt ?? '') 
          });
        } else {
          this.latestImportDetails = null;
          this.latestImportLabel = '';
        }
      },
      error: () => {
        this.totalImports = 0;
        this.totalAffectations = 0;
        this.latestImportDetails = null;
        this.latestImportLabel = '';
      }
    });
  }

  openLatestImportPreview() {
    if (!this.latestImportDetails || !this.selectedConcoursId) return;

    this.previewOpen = true;
    this.previewLoading = true;
    this.previewFileName = this.latestImportDetails.fileName;
    this.previewSheetName = '';
    this.previewHeaders = [];
    this.previewRows = [];

    const url = `${this.baseHost}/api/convocations/admin/affectations/imports/latest-preview`;
    this.http.get<ExcelPreviewResponse>(url, {
      params: { concoursId: this.selectedConcoursId },
      observe: 'body'
    }).subscribe({
      next: (res) => {
        this.previewLoading = false;
        this.previewFileName = res?.fileName || this.latestImportDetails?.fileName || '';
        this.previewSheetName = res?.sheetName || '';
        this.previewHeaders = res?.headers || [];
        this.previewRows = res?.rows || [];
      },
      error: () => {
        this.previewLoading = false;
        this.previewOpen = false;
        Swal.fire({
          title: this.translate.instant('IMPORT.ALERTS.PREVIEW_ERROR'),
          text: this.translate.instant('IMPORT.ALERTS.PREVIEW_ERROR'),
          icon: 'warning',
          confirmButtonColor: '#2389a8'
        });
      }
    });
  }

  closePreview() {
    this.previewOpen = false;
  }

  onViderAffectations() {
    if (!this.selectedConcoursId) return;

    Swal.fire({
      title: this.translate.instant('COMMON.WARNING'),
      text: this.translate.instant('IMPORT.ALERTS.CLEAR_CONFIRM'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.translate.instant('COMMON.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL'),
      heightAuto: false
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.showLoading();
        const url = `${this.baseHost}/api/convocations/admin/affectations/clear`;
        this.http.delete(url, { params: { concoursId: this.selectedConcoursId } }).subscribe({
          next: () => {
            this.loadImportStats();
            Swal.fire({
              title: this.translate.instant('COMMON.SUCCESS'),
              text: this.translate.instant('IMPORT.ALERTS.CLEAR_SUCCESS'),
              icon: 'success',
              confirmButtonColor: '#1e3a8a'
            });
          },
          error: (err) => {
            Swal.fire({
              title: this.translate.instant('COMMON.ERROR'),
              text: err.error?.message || this.translate.instant('COMMON.ERROR_DESC'),
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  publierAffectations() {
    if (!this.selectedConcoursId) return;

    Swal.fire({
      title: this.translate.instant('IMPORT.BTN.PUBLISH'),
      text: this.translate.instant('IMPORT.ALERTS.PUBLISH_CONFIRM'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1e3a8a',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.translate.instant('COMMON.VALIDATE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL'),
      heightAuto: false
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.showLoading();
        const url = `${this.baseHost}/api/convocations/admin/affectations/publish`;
        this.http.post(url, {}, { params: { concoursId: this.selectedConcoursId } }).subscribe({
          next: () => {
            Swal.fire({
              title: this.translate.instant('COMMON.SUCCESS'),
              text: this.translate.instant('IMPORT.ALERTS.PUBLISH_SUCCESS'),
              icon: 'success',
              confirmButtonColor: '#1e3a8a'
            });
          },
          error: (err) => {
            Swal.fire({
              title: this.translate.instant('COMMON.ERROR'),
              text: err.error?.message || this.translate.instant('COMMON.ERROR_DESC'),
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const locale = this.translate.currentLang === 'ar' ? 'ar-SA' : 'fr-FR';
    return date.toLocaleString(locale);
  }

  formatFileSize(sizeInBytes: number): string {
    if (!sizeInBytes || sizeInBytes < 1024) return `${sizeInBytes || 0} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  onDownloadTrace(trace: any) {
    if (!this.selectedConcoursId) return;
    const url = `${this.baseHost}/api/convocations/admin/affectations/imports/latest-file?concoursId=${this.selectedConcoursId}`;
    window.open(url, '_blank');
  }

  loadDataList() {
    if (!this.selectedConcoursId) return;
    const params = {
      concoursId: this.selectedConcoursId,
      page: this.currentPage.toString(),
      size: this.pageSize.toString()
    };
    this.http.get<any>(`${this.baseHost}/api/convocations/admin/affectations/list`, { params }).subscribe({
      next: (data) => {
        this.dataList = data.content;
        this.totalElements = data.totalElements;
        this.totalPages = data.totalPages;
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadDataList();
  }
}
