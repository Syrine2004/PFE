import { Component, OnInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-result-histogram',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="pro-3d-chart-container">
      
      <!-- Chart Legend -->
      <div class="chart-legend">
        <div class="legend-item">
          <span class="color-box admis"></span>
          <span class="legend-lbl">{{ 'ADMIN_DASHBOARD.RESULTS_CHART.ADMIS' | translate }}</span>
        </div>
        <div class="legend-item">
          <span class="color-box refuse"></span>
          <span class="legend-lbl">{{ 'ADMIN_DASHBOARD.RESULTS_CHART.REFUSED' | translate }}</span>
        </div>
      </div>

      <!-- 3D Isometric Chart -->
      <div class="isometric-chart">
        <div class="y-axis-label">{{ 'ADMIN_DASHBOARD.RESULTS_CHART.Y_AXIS' | translate }}</div>
        <div class="chart-y-axis">
          <span *ngFor="let label of yAxisLabels">{{ label }}</span>
        </div>
        
        <div class="chart-bars-area">
          <!-- Horizontal Grid Lines -->
          <div class="grid-line" style="bottom: 20%"></div>
          <div class="grid-line" style="bottom: 40%"></div>
          <div class="grid-line" style="bottom: 60%"></div>
          <div class="grid-line" style="bottom: 80%"></div>
          <div class="grid-line" style="bottom: 100%"></div>

          <!-- Threshold line -->
          <div class="threshold-line" [attr.title]="'ADMIN_DASHBOARD.RESULTS_CHART.THRESHOLD_TITLE' | translate">
            <span class="threshold-label">{{ 'ADMIN_DASHBOARD.RESULTS_CHART.THRESHOLD' | translate }}</span>
          </div>

          <div class="bar-wrapper" *ngFor="let item of data; let i = index" [style.z-index]="i">
            
            <div class="bar-label">{{ item.label }}</div>
            
            <!-- Isometric 3D Bar with Infinite Wave Animation -->
            <div class="bar-3d" [ngClass]="item.type" 
                 [style.--target-height]="maxCount > 0 ? (item.targetValue / maxCount * 100) + '%' : '0%'"
                 [style.animation-delay]="(i * 0.15) + 's'">
                 
              <div class="tooltip-val">{{ item.targetValue }}</div>
              <div class="face top"></div>
              <div class="face right"></div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pro-3d-chart-container {
      width: 100%;
      /* INCREASED HEIGHT AS REQUESTED */
      height: 400px; 
      display: flex;
      flex-direction: column;
      position: relative;
      font-family: 'Outfit', sans-serif;
    }

    .chart-legend {
      display: flex;
      justify-content: flex-end;
      gap: 20px;
      margin-bottom: 30px;
      padding-right: 20px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .color-box {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      &.admis { background: #14b8a6; } /* Teal 500 */
      &.refuse { background: #ef4444; } /* Red 500 */
    }

    .legend-lbl {
      font-size: 0.85rem;
      font-weight: 800;
      color: #475569;
    }

    .isometric-chart {
      display: flex;
      flex: 1;
      position: relative;
      padding-bottom: 50px; /* Space for the large horizontal labels */
    }

    .y-axis-label {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
      color: #94a3b8;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-right: 5px;
      padding-bottom: 25px; /* match the chart-y-axis offset */
    }

    .chart-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-end;
      padding-right: 20px;
      padding-bottom: 0px; /* Aligned exactly with the bottom border */
      color: #94a3b8;
      font-size: 0.9rem; /* Bigger labels */
      font-weight: 800;
      width: 60px;
      height: 100%;
    }

    .chart-bars-area {
      flex: 1;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      border-bottom: 3px solid #cbd5e1;
      border-left: 3px solid #cbd5e1;
      position: relative;
      padding-left: 20px;
      padding-right: 30px;
      height: 100%;
    }

    .grid-line {
      position: absolute;
      left: 0;
      width: 100%;
      height: 1px;
      background: rgba(203, 213, 225, 0.4); /* subtle grid */
      z-index: 0;
    }

    .threshold-line {
      position: absolute;
      left: 17.5%; /* Positioned right between <10 and 10-12 */
      bottom: 0;
      height: 100%;
      width: 2px;
      background: repeating-linear-gradient(to top, #94a3b8, #94a3b8 6px, transparent 6px, transparent 12px);
      z-index: 0;
    }

    .threshold-label {
      position: absolute;
      top: -25px;
      left: -45px;
      background: #64748b;
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }

    .bar-wrapper {
      position: relative;
      height: 100%;
      width: 65px; /* Restored to wider size for the bottom layout */
      cursor: pointer;
      
      &:hover .tooltip-val {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      
      &:hover .bar-3d {
        filter: brightness(1.15);
      }
    }

    .tooltip-val {
      position: absolute;
      top: -35px;
      left: 50%;
      background: #0f172a;
      color: white;
      font-size: 0.85rem;
      font-weight: 900;
      padding: 6px 12px;
      border-radius: 8px;
      opacity: 0;
      transform: translateX(-50%) translateY(10px);
      transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      pointer-events: none;
      white-space: nowrap;
      z-index: 100;
      box-shadow: 0 10px 20px rgba(0,0,0,0.15);
      
      &::after {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px 5px 0;
        border-style: solid;
        border-color: #0f172a transparent transparent transparent;
      }
    }

    @keyframes infiniteGrow {
      0%, 15% { height: 0%; }
      35%, 85% { height: var(--target-height); }
      100% { height: 0%; }
    }

    /* FLAWLESS CSS 3D MATH */
    .bar-3d {
      width: 50px; /* Restored to larger width */
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      will-change: height; /* Hardware acceleration for smooth animation */
      animation: infiniteGrow 8s ease-in-out infinite;
      
      /* Base colors for ADMIS */
      &.admis {
        background: #0f766e; /* Teal 700 - Front face */
        .top { background: #2dd4bf; } /* Teal 400 */
        .right { background: #115e59; } /* Teal 800 */
      }
      
      /* Base colors for REFUSE */
      &.refuse {
        background: #b91c1c; /* Red 700 - Front face */
        .top { background: #f87171; } /* Red 400 */
        .right { background: #991b1b; } /* Red 800 */
      }
    }

    .bar-3d .top {
      position: absolute;
      top: -18px; /* EXACTLY its height */
      left: 0;
      width: 100%;
      height: 18px;
      transform: skewX(-45deg);
      transform-origin: bottom left;
    }

    .bar-3d .right {
      position: absolute;
      top: 0;
      right: -18px; /* EXACTLY its width */
      width: 18px;
      height: 100%;
      transform: skewY(-45deg);
      transform-origin: top left;
    }

    .bar-label {
      position: absolute;
      bottom: -35px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.95rem; /* BIGGER HORIZONTAL LABELS */
      font-weight: 900;
      color: #334155;
      white-space: nowrap;
    }
  `]
})
export class ResultHistogramComponent implements OnInit, OnChanges {
  @Input() concoursId?: string;
  // We have a max of 1000 on the Y-axis (hardcoded in template). 
  // Wait, I will just let the template keep 1000, but compute targetValue as real counts.
  // Actually, targetValue is used to calculate height % as (targetValue / 10).
  // I should update it to adapt to max value.
  public maxCount = 1000;
  public yAxisLabels: string[] = ['1000', '800', '600', '400', '200', '0'];
  
  public data = [
    { label: '< 10', targetValue: 0, type: 'refuse' },
    { label: '10-12', targetValue: 0, type: 'admis' },
    { label: '12-14', targetValue: 0, type: 'admis' },
    { label: '14-16', targetValue: 0, type: 'admis' },
    { label: '16-18', targetValue: 0, type: 'admis' },
    { label: '> 18', targetValue: 0,  type: 'admis' }
  ];

  private baseHost = window.location.origin.replace(':4200', ':8080');

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Initial fetch
    this.fetchData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['concoursId'] && !changes['concoursId'].firstChange) {
      this.fetchData();
    }
  }

  private fetchData() {
    const cid = this.concoursId;
    // Don't send empty strings as params to avoid global fallback in backend
    const params = (cid && cid.trim() !== '') ? `?concoursId=${cid}` : '';
    
    console.log(`[Histogram] Fetching data for concoursId: [${cid}]`);
    this.http.get<any>(`${this.baseHost}/api/admin/resultats/stats/histogram${params}`).subscribe({
      next: (stats) => {
        this.data = [
          { label: '< 10', targetValue: stats['< 10'] || 0, type: 'refuse' },
          { label: '10-12', targetValue: stats['10-12'] || 0, type: 'admis' },
          { label: '12-14', targetValue: stats['12-14'] || 0, type: 'admis' },
          { label: '14-16', targetValue: stats['14-16'] || 0, type: 'admis' },
          { label: '16-18', targetValue: stats['16-18'] || 0, type: 'admis' },
          { label: '> 18', targetValue: stats['> 18'] || 0,  type: 'admis' }
        ];
        
        let localMax = 0;
        this.data.forEach(d => { if(d.targetValue > localMax) localMax = d.targetValue; });
        
        if(localMax === 0) {
          this.maxCount = 10; 
        } else if (localMax <= 5) {
          this.maxCount = 5;
        } else {
          this.maxCount = Math.ceil(localMax * 1.2 / 5) * 5; // Round to nearest 5 for cleaner axis
        }

        this.yAxisLabels = [
          Math.round(this.maxCount).toString(),
          Math.round(this.maxCount * 0.8).toString(),
          Math.round(this.maxCount * 0.6).toString(),
          Math.round(this.maxCount * 0.4).toString(),
          Math.round(this.maxCount * 0.2).toString(),
          '0'
        ];
      },
      error: (err) => console.error('Error fetching histogram stats', err)
    });
  }
}
