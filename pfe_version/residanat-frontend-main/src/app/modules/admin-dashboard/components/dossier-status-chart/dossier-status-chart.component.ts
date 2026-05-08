import { Component, OnInit, inject, Input, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-dossier-status-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="status-cards-container">
      
      <!-- System Monitor Header -->
      <div class="monitor-header">
        <div class="monitor-icon-wrapper">
          <div class="pulse-ring ring-1"></div>
          <div class="monitor-icon">
            <span class="icon">📁</span>
          </div>
        </div>
        <div class="monitor-info">
          <span class="monitor-title">{{ 'ADMIN_DASHBOARD.DOSSIER_CHART.TITLE' | translate }}</span>
          <div class="monitor-status">
            <span class="live-dot"></span>
            <span>{{ 'ADMIN_DASHBOARD.DOSSIER_CHART.LIVE' | translate }}</span>
          </div>
        </div>
      </div>

      <!-- Status Cards List -->
      <div class="status-cards-list">
        <div class="status-card" *ngFor="let item of data; let i = index" [style.animation-delay]="(i * 0.1) + 's'">
          
          <div class="card-top">
            <span class="status-label">{{ item.label }}</span>
            <span class="status-value">{{ item.value }}</span>
          </div>
          
          <div class="progress-track">
            <div class="progress-fill" 
                 [ngClass]="item.colorClass"
                 [style.--target-width]="totalDossiers > 0 ? (item.value / totalDossiers) * 100 + '%' : '0%'">
              <div class="shimmer"></div>
            </div>
          </div>
          
          <div class="card-bottom">
            <span class="detail-text" [ngClass]="item.colorClass">{{ item.detail }}</span>
            <span class="percentage-text">{{ 'ADMIN_DASHBOARD.DOSSIER_CHART.TOTAL_PCT' | translate:{pct: (totalDossiers > 0 ? (((item.value / totalDossiers) * 100) | number:'1.0-1') : 0)} }}</span>
          </div>
          
        </div>
      </div>

    </div>
  `,
  styles: [`
    .status-cards-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding: 10px 5px;
      font-family: 'Outfit', sans-serif;
    }

    /* --- MONITOR HEADER --- */
    .monitor-header {
      display: flex;
      align-items: center;
      gap: 15px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 16px;
      padding: 12px 18px;
      margin-bottom: 5px;
    }

    .monitor-icon-wrapper {
      position: relative;
      width: 45px;
      height: 45px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .monitor-icon {
      position: relative;
      z-index: 10;
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0ea5e9, #0369a1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 10px rgba(14, 165, 233, 0.3);
      .icon { font-size: 1.1rem; }
    }

    .pulse-ring {
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 12px;
      border: 2px solid #0ea5e9;
      animation: iconPulse 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
    }

    @keyframes iconPulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .monitor-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .monitor-title {
      font-size: 1rem;
      font-weight: 800;
      color: #0c4a6e;
    }

    .monitor-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      color: #0369a1;
      
      .live-dot {
        width: 6px;
        height: 6px;
        background: #0ea5e9;
        border-radius: 50%;
        animation: blink 1s ease-in-out infinite;
      }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* --- STATUS CARDS LIST --- */
    .status-cards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .status-card {
      background: white;
      border: 1px solid #f1f5f9;
      border-radius: 14px;
      padding: 12px 16px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.02);
      opacity: 0;
      animation: slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      transition: all 0.3s ease;

      &:hover {
        transform: scale(1.02);
        box-shadow: 0 10px 20px rgba(0,0,0,0.04);
        border-color: #e2e8f0;
      }
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .status-label {
      font-size: 0.85rem;
      font-weight: 800;
      color: #334155;
    }

    .status-value {
      font-size: 1rem;
      font-weight: 900;
      color: #0f172a;
    }

    .progress-track {
      width: 100%;
      height: 6px;
      background: #f1f5f9;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    @keyframes fillProgress {
      from { width: 0; }
      to { width: var(--target-width); }
    }

    .progress-fill {
      height: 100%;
      width: 0;
      border-radius: 3px;
      position: relative;
      overflow: hidden;
      animation: fillProgress 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      animation-delay: 0.3s;

      &.blue { background: linear-gradient(90deg, #3b82f6, #2563eb); }
      &.green { background: linear-gradient(90deg, #10b981, #059669); }
      &.red { background: linear-gradient(90deg, #ef4444, #dc2626); }
      &.orange { background: linear-gradient(90deg, #f97316, #ea580c); }
    }

    .shimmer {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: shimmerMove 2s infinite;
    }

    @keyframes shimmerMove {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .detail-text {
      &.blue { color: #3b82f6; }
      &.green { color: #10b981; }
      &.red { color: #ef4444; }
      &.orange { color: #f97316; }
    }

    .percentage-text {
      color: #94a3b8;
    }
  `]
})
export class DossierStatusChartComponent implements OnInit, OnChanges {
  @Input() concoursId?: string;
  private translate = inject(TranslateService);
  private http = inject(HttpClient);

  data = [
    { label: '', value: 0, colorClass: 'blue', detail: '', key: 'PENDING' },
    { label: '', value: 0, colorClass: 'orange', detail: '', key: 'IN_PROGRESS' },
    { label: '', value: 0, colorClass: 'green', detail: '', key: 'VALIDATED' },
    { label: '', value: 0, colorClass: 'red', detail: '', key: 'REJECTED' }
  ];

  totalDossiers: number = 0;
  private baseHost = (window.location.port === '4200' || window.location.hostname === 'localhost') 
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;

  constructor() {}

  ngOnInit() {
    this.initLabels();
    // fetchData is called by ngOnChanges on first load
    this.translate.onLangChange.subscribe(() => this.initLabels());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['concoursId']) {
      this.fetchData();
    }
  }

  private initLabels() {
    this.data.forEach(item => {
      item.label = this.translate.instant(`ADMIN_DASHBOARD.DOSSIER_CHART.${item.key}`);
      item.detail = this.translate.instant(`ADMIN_DASHBOARD.DOSSIER_CHART.DETAIL_${item.key}`);
    });
  }

  private fetchData() {
    const params = this.concoursId ? `?concoursId=${this.concoursId}` : '';
    this.http.get<any>(`${this.baseHost}/api/dossiers/stats/counts-by-status${params}`).subscribe({
      next: (stats) => {
        this.totalDossiers = stats['total'] || 0;
        
        const enAttente = (stats['en_attente'] || 0) + (stats['en_attente_depot'] || 0);
        const enCours = stats['en_cours_traitement'] || 0;
        const valide = stats['valide'] || 0;
        const rejete = stats['rejete'] || 0;

        this.data[0].value = enAttente;
        this.data[1].value = enCours;
        this.data[2].value = valide;
        this.data[3].value = rejete;
      },
      error: (err) => console.error('Error fetching dossier status stats', err)
    });
  }
}
