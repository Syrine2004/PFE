import { Component, OnInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-claims-doughnut',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="ai-triage-container">
      
      <!-- AI Pulse Core (Horizontal Header) -->
      <div class="ai-core-header">
        <div class="ai-core-wrapper">
          <div class="pulse-ring ring-1"></div>
          <div class="pulse-ring ring-2"></div>
          <div class="ai-core">
            <span class="ai-number">{{ totalUrgents }}</span>
          </div>
        </div>
        <div class="ai-info">
          <span class="ai-text">{{ 'ADMIN_DASHBOARD.CLAIMS.URGENT_DOSSIERS' | translate }}</span>
          <div class="ai-status">
            <span class="robot-icon">🤖</span> 
            <span>{{ 'ADMIN_DASHBOARD.CLAIMS.AI_ACTIVE' | translate }}</span>
          </div>
        </div>
      </div>

      <!-- Categories Breakdown (Full Width List) -->
      <div class="categories-list">
        <div class="cat-item" *ngFor="let cat of categories; let i = index" [style.animation-delay]="(i * 0.15) + 's'">
          
          <div class="cat-header">
            <span class="cat-name">{{ 'RECLAMATIONS.CATEGORIES.' + cat.id | translate }}</span>
            <div class="cat-badge" *ngIf="cat.critical > 0">
               <span class="pulse-dot"></span> {{ cat.critical }} {{ 'ADMIN_DASHBOARD.CLAIMS.CRITICAL' | translate }}
            </div>
            <div class="cat-badge success" *ngIf="cat.critical === 0">
               ✓ {{ 'ADMIN_DASHBOARD.CLAIMS.UP_TO_DATE' | translate }}
            </div>
          </div>
          
          <div class="cat-progress-bg">
            <div class="cat-progress-fill" 
                 [ngClass]="cat.colorClass"
                 [style.--target-width]="cat.resolvedRate + '%'">
              <div class="shimmer-effect"></div>
            </div>
          </div>
          
          <div class="cat-footer">
            <span class="stat-total">{{ cat.total }} {{ 'COMMON.TOTAL' | translate }}</span>
            <span class="stat-rate">{{ cat.resolvedRate }}% {{ 'ADMIN_DASHBOARD.CLAIMS.RESOLVED' | translate }}</span>
          </div>
          
        </div>
      </div>

    </div>
  `,
  styles: [`
    .ai-triage-container {
      display: flex;
      flex-direction: column; /* STACK VERTICALLY */
      gap: 20px;
      height: auto; /* ALLOW TO GROW */
      min-height: 380px;
      padding: 10px 5px;
      font-family: 'Outfit', sans-serif;
    }

    /* --- AI CORE HEADER --- */
    .ai-core-header {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: 20px;
      background: #fdf2f8;
      border: 1px solid #fbcfe8;
      border-radius: 16px;
      padding: 12px 20px;
    }

    .ai-core-wrapper {
      position: relative;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ai-core {
      position: relative;
      z-index: 10;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .ai-number {
      font-size: 1.5rem;
      font-weight: 900;
      line-height: 1;
    }

    .pulse-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 2px solid #ef4444;
      animation: radarPulse 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
    }

    .ring-2 { animation-delay: 1s; }

    @keyframes radarPulse {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
    }

    .ai-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ai-text {
      font-size: 1.1rem;
      font-weight: 900;
      color: #9f1239;
      letter-spacing: 0.5px;
    }

    .ai-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      color: #ea580c;
      background: #fff7ed;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid #ffedd5;
      width: fit-content;
      
      .robot-icon { font-size: 0.9rem; }
    }

    /* --- CATEGORIES LIST --- */
    .categories-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 15px;
      justify-content: center;
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .cat-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      opacity: 0;
      animation: slideInRight 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0; left: 0; width: 4px; height: 100%;
        background: transparent;
        transition: background 0.3s;
      }
      
      &:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        border-color: #cbd5e1;
      }
      
      /* Dynamic left border glow on hover */
      &:nth-child(1):hover::before { background: #3b82f6; }
      &:nth-child(2):hover::before { background: #f97316; }
      &:nth-child(3):hover::before { background: #14b8a6; }
      &:nth-child(4):hover::before { background: #8b5cf6; }
      &:nth-child(5):hover::before { background: #64748b; }
    }

    .cat-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start; /* Align top so wrapping works if needed */
      margin-bottom: 10px;
      gap: 10px;
    }

    .cat-name {
      font-size: 0.9rem;
      font-weight: 900;
      color: #1e293b;
      line-height: 1.2;
    }

    .cat-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      color: #ef4444;
      background: #fef2f2;
      padding: 4px 10px;
      border-radius: 6px;
      white-space: nowrap; /* PREVENT WRAPPING inside badge */
      flex-shrink: 0;
      
      &.success {
        color: #10b981;
        background: #ecfdf5;
      }
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      background: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      animation: dotPulse 1.5s infinite;
    }

    @keyframes dotPulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    .cat-progress-bg {
      width: 100%;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 6px;
    }

    @keyframes fillProgress {
      from { width: 0; }
      to { width: var(--target-width); }
    }

    .cat-progress-fill {
      height: 100%;
      border-radius: 3px;
      width: 0;
      position: relative;
      overflow: hidden;
      animation: fillProgress 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      animation-delay: 0.5s; /* Wait for slide-in to finish */
      
      &.blue { background: #3b82f6; }
      &.teal { background: #14b8a6; }
      &.orange { background: #f97316; }
      &.purple { background: #8b5cf6; }
      &.gray { background: #64748b; }
    }

    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }

    .shimmer-effect {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
      transform: translateX(-100%);
      animation: shimmer 2.5s infinite;
    }

    .cat-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
    }
  `]
})
export class ClaimsDoughnutComponent implements OnInit, OnChanges {
  @Input() concoursId?: string;
  public categories = [
    { id: 'TECHNIQUE', name: 'Technique', total: 0, critical: 0, resolvedRate: 0, colorClass: 'blue' },
    { id: 'INSCRIPTION', name: 'Inscription', total: 0, critical: 0, resolvedRate: 0, colorClass: 'orange' },
    { id: 'RESULTAT', name: 'Résultat', total: 0, critical: 0, resolvedRate: 0, colorClass: 'teal' },
    { id: 'PROBLEME_RESULTAT', name: 'Problème Résultat', total: 0, critical: 0, resolvedRate: 0, colorClass: 'purple' },
    { id: 'AUTRE', name: 'Autre', total: 0, critical: 0, resolvedRate: 0, colorClass: 'gray' }
  ];

  public totalUrgents = 0;

  private baseHost = (window.location.port === '4200' || window.location.hostname === 'localhost') 
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // fetchData is called by ngOnChanges on first load
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['concoursId']) {
      this.fetchData();
    }
  }

  private fetchData() {
    const params = this.concoursId ? `?concoursId=${this.concoursId}` : '';
    this.http.get<any>(`${this.baseHost}/api/admin/reclamations/stats/dashboard${params}`).subscribe({
      next: (stats) => {
        this.totalUrgents = stats.totalUrgents || 0;
        
        if (stats.categories && Array.isArray(stats.categories)) {
          this.categories = stats.categories.map((cat: any) => {
            const existingCat = this.categories.find(c => c.id === cat.categoryId);
            return {
              id: cat.categoryId,
              name: cat.categoryId, // Fallback, translate in HTML
              total: cat.total,
              critical: cat.critical,
              resolvedRate: cat.resolvedRate,
              colorClass: existingCat ? existingCat.colorClass : 'gray'
            };
          });
        }
      },
      error: (err) => console.error('Error fetching claims stats', err)
    });
  }
}
