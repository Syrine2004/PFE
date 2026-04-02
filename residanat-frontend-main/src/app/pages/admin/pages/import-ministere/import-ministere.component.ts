import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConcoursService, Concours } from '../../../../core/services/concours.service';

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
    importedAt?: string;
    importedCount?: number;
    concoursId?: string;
  };
}

interface LatestImportDetails {
  fileName: string;
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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="app-container">
      <div class="header-glass">
        <h1 class="page-title">Liste Ministérielle</h1>
        <p class="page-subtitle">Importation sécurisée des affectations de candidats (CIN)</p>
      </div>

      <div class="glass-card">
        
        <div class="config-section">
          <div class="form-group">
            <label class="floating-label">Sélectionnez le concours cible</label>
            <div class="custom-select-wrapper" (click)="toggleDropdown($event)">
              <div class="custom-select-trigger" [class.open]="isDropdownOpen">
                <span>{{ selectedConcoursLabel }}</span>
                <div class="arrow" [class.open]="isDropdownOpen">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <div class="custom-options" *ngIf="isDropdownOpen" (click)="$event.stopPropagation()">
                <div class="custom-option" [class.selected]="!selectedConcoursId" (click)="selectConcours('')">
                   Choisir un concours...
                </div>
                <div class="custom-option" *ngFor="let c of concoursOptions" [class.selected]="selectedConcoursId === c.id" (click)="selectConcours(c.id || '')">
                  {{ c.libelle || c.titre || 'Concours' }} - {{ c.annee }}
                </div>
              </div>
            </div>
          </div>

          <div class="lock-alert" *ngIf="selectedConcoursId && totalAffectations > 0">
            <div class="lock-icon-bg">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div class="lock-content">
              <h4>Données déjà importées</h4>
              <p>Un réimport n'est autorisé qu'en cas de rectification du ministère.</p>
              <label class="modern-toggle">
                 <input type="checkbox" [(ngModel)]="correctionMode">
                 <div class="toggle-track">
                    <div class="toggle-thumb"></div>
                 </div>
                 <span>Activer le mode correction</span>
              </label>
            </div>
          </div>
        </div>

        <div class="stats-wrapper">
          <div class="stat-box">
            <div class="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div class="stat-data">
              <span class="stat-val">{{ totalAffectations }}</span>
              <span class="stat-name">CIN importés</span>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg></div>
            <div class="stat-data">
              <span class="stat-val">{{ totalImports }}</span>
              <span class="stat-name">Fichiers ajoutés</span>
            </div>
          </div>
          <div class="stat-box clickable" (click)="openLatestImportPreview()" [class.has-latest]="!!latestImportDetails">
             <div class="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
             <div class="stat-data latest-data">
                <span class="stat-name">Dernier import</span>
                <span class="stat-val small-val" *ngIf="latestImportLabel">{{ latestImportLabel.split('-')[0] }}</span>
                <span class="stat-sub" *ngIf="latestImportLabel">{{ latestImportLabel.split('-')[1] }}</span>
                <span class="stat-val small-val" *ngIf="!latestImportLabel">Aucun</span>
             </div>
          </div>
        </div>

        <div class="dropzone" [class.active]="selectedFile" [class.uploading]="isUploading" (click)="fileInput.click()">
          <input type="file" #fileInput hidden (change)="onFileSelected($event)" accept=".xlsx, .xls">
          
          <div class="upload-content" *ngIf="!selectedFile">
            <div class="icon-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#grad1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0284c7" /><stop offset="100%" stop-color="#0ea5e9" /></linearGradient></defs><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <h3>Sélectionnez votre fichier Excel</h3>
            <p>Glissez-déposez ou cliquez ici pour parcourir (max 10 MB)</p>
          </div>

          <div class="upload-content has-file" *ngIf="selectedFile">
             <div class="success-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
             </div>
             <h3>{{ selectedFile.name }}</h3>
             <p class="file-ready">{{ (selectedFile.size / 1024).toFixed(2) }} KB • Prêt à l'import</p>
          </div>

          <div class="progress-overlay" *ngIf="isUploading" (click)="$event.stopPropagation()">
             <div class="progress-header">
               <span>Vérification et Importation...</span>
               <span class="progress-percentage">{{ uploadProgress }}%</span>
             </div>
             <div class="progress-track">
               <div class="progress-fill" [style.width.%]="uploadProgress"></div>
             </div>
          </div>
        </div>

        <div class="action-panel">
          <button class="btn-modern btn-ghost" (click)="resetFile()" [disabled]="isUploading || !selectedFile">
            Annuler
          </button>
          <button class="btn-modern btn-gradient" (click)="uploadFile()" 
                  [disabled]="isUploading || !selectedFile || !selectedConcoursId || (totalAffectations > 0 && !correctionMode)">
            <span>Démarrer l'importation</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>

      </div>

      <!-- Aperçu Modal -->
      <div class="modal-backdrop" *ngIf="previewOpen" (click)="closePreview()">
        <div class="glass-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
             <div class="modal-titles">
               <h3>Aperçu des données</h3>
               <p>{{ previewFileName }} <span *ngIf="previewSheetName">• {{ previewSheetName }}</span></p>
             </div>
             <button class="close-btn" (click)="closePreview()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             </button>
          </div>
          <div class="modal-body" *ngIf="!previewLoading; else previewLoadingTpl">
            <div class="empty-state" *ngIf="previewHeaders.length === 0">Aucune donnée à afficher.</div>
            <div class="table-container" *ngIf="previewHeaders.length > 0">
              <table class="modern-table">
                <thead>
                  <tr><th *ngFor="let h of previewHeaders">{{ h || '-' }}</th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of previewRows">
                     <td *ngFor="let cell of row">{{ cell || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <ng-template #previewLoadingTpl>
             <div class="loading-state">
               <div class="spinner"></div>
               <p>Chargement des colonnes...</p>
             </div>
          </ng-template>
        </div>
      </div>

    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    .app-container {
      font-family: 'Plus Jakarta Sans', sans-serif;
      max-width: 960px;
      margin: 3rem auto;
      padding: 0 1.5rem;
      color: #1e293b;
    }

    /* Header */
    .header-glass {
      text-align: left;
      margin-bottom: 2.5rem;
      animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .page-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.03em;
      margin: 0 0 0.5rem;
      background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .page-subtitle {
      font-size: 1.1rem;
      color: #64748b;
      margin: 0;
      font-weight: 500;
    }

    /* Main Card */
    .glass-card {
      background: #ffffff;
      border-radius: 24px;
      padding: 2.5rem;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(226, 232, 240, 0.8);
      position: relative;
      overflow: hidden;
      animation: fadeIn 0.8s ease-out;
    }

    /* Config Section */
    .config-section {
      display: grid;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .floating-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: #334155;
    }

    .custom-select-wrapper {
      position: relative;
      user-select: none;
      width: 100%;
    }

    .custom-select-trigger {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      padding: 1rem 1.25rem;
      font-size: 1rem;
      font-weight: 600;
      color: #0f172a;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .custom-select-trigger:hover {
      border-color: #cbd5e1;
    }

    .custom-select-trigger.open {
      border-color: #38bdf8;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
    }

    .custom-select-trigger .arrow {
      color: #94a3b8;
      transition: transform 0.3s ease;
    }

    .custom-select-trigger .arrow.open {
      transform: rotate(180deg);
    }

    .custom-options {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      z-index: 50;
      overflow: hidden;
      max-height: 250px;
      overflow-y: auto;
      animation: fadeIn 0.15s ease-out;
    }

    .custom-option {
      padding: 0.85rem 1.25rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
      background: #ffffff;
    }

    .custom-option:hover {
      background: #f0f9ff;
      color: #0284c7;
    }

    .custom-option.selected {
      background: #ecfeff;
      color: #0369a1;
      border-left: 3px solid #0284c7;
      padding-left: calc(1.25rem - 3px);
    }

    /* Lock Alert */
    .lock-alert {
      display: flex;
      gap: 1.25rem;
      background: linear-gradient(to right, #fffbeb, #fef3c7);
      border: 1px solid #fde68a;
      border-radius: 16px;
      padding: 1.25rem;
      align-items: flex-start;
      animation: slideIn 0.4s ease-out;
    }

    .lock-icon-bg {
      background: #fef08a;
      padding: 0.75rem;
      border-radius: 12px;
      display: flex;
      flex-shrink: 0;
    }

    .lock-content h4 {
      margin: 0 0 0.25rem;
      color: #92400e;
      font-size: 1rem;
      font-weight: 700;
    }

    .lock-content p {
      margin: 0 0 1rem;
      color: #b45309;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    /* Toggle Switch */
    .modern-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }

    .modern-toggle input {
      display: none;
    }

    .toggle-track {
      width: 44px;
      height: 24px;
      background: #d1d5db;
      border-radius: 12px;
      position: relative;
      transition: background 0.3s;
    }

    .toggle-thumb {
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 3px;
      left: 3px;
      transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .modern-toggle input:checked + .toggle-track {
      background: #0284c7;
    }

    .modern-toggle input:checked + .toggle-track .toggle-thumb {
      transform: translateX(20px);
    }

    .modern-toggle span {
      font-size: 0.9rem;
      font-weight: 600;
      color: #1e293b;
      user-select: none;
    }

    /* Stats */
    .stats-wrapper {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .stat-box {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all 0.3s ease;
    }

    .stat-box.primary {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: white;
      box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.3);
      border: none;
    }

    .stat-box.primary .stat-icon {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .stat-box.primary .stat-name {
      color: rgba(255,255,255,0.9);
    }

    .stat-box.clickable {
      cursor: pointer;
    }

    .stat-box.clickable.has-latest:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -5px rgba(0,0,0,0.05);
      border-color: #cbd5e1;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      background: #ffffff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0284c7;
      flex-shrink: 0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }

    .stat-data {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .stat-val {
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1.2;
      color: inherit;
    }

    .stat-box:not(.primary) .stat-val {
      color: #0f172a;
    }

    .stat-name {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .latest-data .stat-name {
      margin-bottom: 0.2rem;
    }

    .latest-data .small-val {
      font-size: 0.95rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .stat-sub {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 500;
    }

    /* Dropzone */
    .dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: 20px;
      padding: 3rem 2rem;
      text-align: center;
      background: #f8fafc;
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      margin-bottom: 2.5rem;
    }

    .dropzone:hover {
      border-color: #38bdf8;
      background: #f0f9ff;
    }

    .dropzone.active {
      border-color: #10b981;
      background: #ecfdf5;
      border-style: solid;
    }

    .icon-pulse {
      width: 80px;
      height: 80px;
      background: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.15);
      animation: float 3s ease-in-out infinite;
    }

    .success-icon {
      width: 80px;
      height: 80px;
      background: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.15);
    }

    .upload-content h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.5rem;
    }

    .upload-content p {
      font-size: 0.95rem;
      color: #64748b;
      margin: 0;
    }

    .file-ready {
      color: #059669 !important;
      font-weight: 600;
    }

    /* Progress Overlay */
    .progress-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 3rem;
      z-index: 10;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      font-weight: 700;
      color: #0284c7;
      font-size: 1.1rem;
    }

    .progress-track {
      height: 12px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0ea5e9, #0284c7);
      border-radius: 999px;
      transition: width 0.3s ease;
      position: relative;
    }
    
    .progress-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: shimmer 1.5s infinite;
    }

    /* Actions */
    .action-panel {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .btn-modern {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 2rem;
      border-radius: 14px;
      font-size: 1.05rem;
      font-weight: 700;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-gradient {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
      box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.4);
    }

    .btn-gradient:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 15px 25px -5px rgba(2, 132, 199, 0.5);
    }

    .btn-ghost {
      background: #f1f5f9;
      color: #475569;
    }

    .btn-ghost:hover:not(:disabled) {
      background: #e2e8f0;
      color: #0f172a;
    }

    .btn-modern:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    /* Modal Backdrop glassmorphism */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.3s ease;
    }

    .glass-modal {
      background: #ffffff;
      width: 100%;
      max-width: 1000px;
      max-height: 85vh;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }

    .modal-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }

    .modal-titles h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.25rem;
    }

    .modal-titles p {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0;
      font-weight: 500;
    }

    .close-btn {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
      transform: rotate(90deg);
    }

    .modal-body {
      padding: 0;
      overflow: auto;
      flex-grow: 1;
      background: #ffffff;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      color: #64748b;
      font-weight: 600;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #0ea5e9;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    .empty-state {
      padding: 4rem;
      text-align: center;
      color: #64748b;
      font-weight: 500;
      font-size: 1.1rem;
    }

    .table-container {
      width: 100%;
      overflow: auto;
    }

    .modern-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .modern-table th {
      position: sticky;
      top: 0;
      background: #ffffff;
      padding: 1rem 1.5rem;
      text-align: left;
      font-weight: 700;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
      box-shadow: 0 1px 0 #e2e8f0;
      z-index: 10;
    }

    .modern-table td {
      padding: 1rem 1.5rem;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
      white-space: nowrap;
    }

    .modern-table tbody tr:hover {
      background: #f8fafc;
    }

    /* Animations */
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .stats-wrapper {
        grid-template-columns: 1fr;
      }
      .glass-card {
        padding: 1.5rem;
      }
      .action-panel {
        flex-direction: column;
      }
      .btn-modern {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class ImportMinistereComponent implements OnInit {
  private http = inject(HttpClient);
  private concoursService = inject(ConcoursService);

  isDropdownOpen = false;

  @HostListener('document:click')
  onDocumentClick() {
    this.isDropdownOpen = false;
  }

  get selectedConcoursLabel(): string {
    if (!this.selectedConcoursId) return 'Choisir un concours...';
    const c = this.concoursOptions.find(opt => opt.id === this.selectedConcoursId);
    return c ? `${c.libelle || c.titre || 'Concours'} - ${c.annee}` : 'Choisir un concours...';
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
  uploadHistory: ImportTrace[] = [];
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

  private baseHost = window.location.hostname === 'localhost' ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.hostname}`;
  private apiUrl = `${this.baseHost}/api/convocations/admin/affectations/import`;
  private statsUrl = `${this.baseHost}/api/convocations/admin/affectations/imports/stats`;
  private readonly uploadHistoryStorageKey = 'ministere_upload_history';

  ngOnInit(): void {
    this.loadUploadHistory();
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
    this.loadImportStats();
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
    if (!this.selectedFile) return;
    if (!this.selectedConcoursId) {
      Swal.fire({
        title: 'Concours requis',
        text: 'Veuillez sélectionner le concours cible avant l\'import.',
        icon: 'warning',
        confirmButtonColor: '#2389a8'
      });
      return;
    }

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
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.appendUploadedFile(this.selectedFile, event.body?.count ?? 0, this.selectedConcoursId);
          this.loadImportStats();
          Swal.fire({
            title: 'Succès !',
            text: `${event.body.count} affectations ont été importées avec succès pour ce concours.`,
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
            title: 'Import déjà verrouillé',
            text: err.error?.message || 'Ce concours est déjà importé. Activez le mode correction ministérielle pour réimporter.',
            icon: 'warning',
            confirmButtonColor: '#2389a8'
          });
          return;
        }
        Swal.fire({
          title: 'Erreur',
          text: err.error?.error || err.error?.message || 'Erreur lors du téléversement du fichier.',
          icon: 'error',
          confirmButtonColor: '#2389a8'
        });
      }
    });
  }

  loadUploadHistory() {
    try {
      const raw = localStorage.getItem(this.uploadHistoryStorageKey);
      this.uploadHistory = raw ? (JSON.parse(raw) as ImportTrace[]) : [];
    } catch {
      this.uploadHistory = [];
    }
  }

  appendUploadedFile(file: File | null, importedCount: number, concoursId: string) {
    if (!file) return;

    const concours = this.concoursOptions.find(c => c.id === concoursId);
    const concoursLabel = concours ? `${concours.libelle || concours.titre || 'Concours'} - ${concours.annee}` : concoursId;

    const item: ImportTrace = {
      name: file.name,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      importedCount,
      concoursId,
      concoursLabel
    };

    this.uploadHistory = [item, ...this.uploadHistory].slice(0, 30);
    localStorage.setItem(this.uploadHistoryStorageKey, JSON.stringify(this.uploadHistory));
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
        this.latestImportDetails = latest?.fileName
          ? {
              fileName: latest.fileName,
              importedAt: latest.importedAt ?? '',
              importedCount: latest.importedCount ?? 0,
              concoursId: latest.concoursId
            }
          : null;
        this.latestImportLabel = latest?.fileName
          ? `${latest.fileName} (${latest.importedCount ?? 0} ligne(s)) - ${this.formatDate(latest.importedAt ?? '')}`
          : '';
      },
      error: () => {
        const scopedHistory = this.selectedConcoursId
          ? this.uploadHistory.filter(item => item.concoursId === this.selectedConcoursId)
          : this.uploadHistory;
        this.totalImports = scopedHistory.length;
        this.totalAffectations = scopedHistory.reduce((sum, item) => sum + (item.importedCount || 0), 0);
        const latest = scopedHistory[0];
        this.latestImportDetails = latest
          ? {
              fileName: latest.name,
              importedAt: latest.uploadedAt,
              importedCount: latest.importedCount,
              concoursId: latest.concoursId
            }
          : null;
        this.latestImportLabel = latest
          ? `${latest.name} (${latest.importedCount} ligne(s)) - ${this.formatDate(latest.uploadedAt)}`
          : '';
      }
    });
  }

  openLatestImportPreview() {
    if (!this.latestImportDetails || !this.selectedConcoursId) {
      return;
    }

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
          title: 'Aperçu indisponible',
          text: 'Impossible de charger l\'aperçu du fichier Excel.',
          icon: 'warning',
          confirmButtonColor: '#2389a8'
        });
      }
    });
  }

  closePreview() {
    this.previewOpen = false;
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('fr-FR');
  }

  formatFileSize(sizeInBytes: number): string {
    if (!sizeInBytes || sizeInBytes < 1024) return `${sizeInBytes || 0} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
