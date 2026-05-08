import { Component, OnInit, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-top-specialties',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="specialties-container">
      <div class="spec-row" *ngFor="let spec of specialties">
        <div class="spec-info">
          <span class="spec-name">{{ getTranslatedName(spec.name) }}</span>
          <span class="spec-count">{{ spec.count }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="spec.percentage" [style.background]="spec.color"></div>
        </div>
      </div>
      <div *ngIf="specialties.length === 0" class="no-data">
        {{ 'COMMON.NO_DATA' | translate }}
      </div>
    </div>
  `,
  styles: [`
    .specialties-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding: 10px;
    }

    .spec-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .spec-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .spec-name { font-size: 0.85rem; font-weight: 700; color: #1e293b; }
      .spec-count { font-size: 0.8rem; font-weight: 800; color: #64748b; }
    }

    .progress-bar {
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 1s ease-in-out;
    }

    .no-data {
      text-align: center;
      padding: 20px;
      color: #94a3b8;
      font-size: 0.9rem;
      font-style: italic;
    }
  `]
})
export class TopSpecialtiesComponent implements OnInit, OnChanges {
  @Input() concoursId: string = '';
  specialties: any[] = [];
  private translate = inject(TranslateService);
  private http = inject(HttpClient);

  private baseHost = (window.location.port === '4200' || window.location.hostname === 'localhost') 
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;

  constructor() {}

  getTranslatedName(name: string): string {
    if (!name) return '';
    const n = name.toUpperCase();
    if (n.includes('TUNIS')) return this.translate.instant('CENTRE_3D.FACULTES.TUNIS');
    if (n.includes('SFAX')) return this.translate.instant('CENTRE_3D.FACULTES.SFAX');
    if (n.includes('SOUSSE')) return this.translate.instant('CENTRE_3D.FACULTES.SOUSSE');
    if (n.includes('MONASTIR')) return this.translate.instant('CENTRE_3D.FACULTES.MONASTIR');
    return name;
  }

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
    this.http.get<any[]>(`${this.baseHost}/api/convocations/stats/by-faculte${params}`).subscribe({
      next: (stats) => {
        const aggregated: { [key: string]: number } = {};
        stats.forEach(s => {
          const name = (s.faculte || '').trim();
          aggregated[name] = (aggregated[name] || 0) + s.count;
        });

        let total = 0;
        Object.values(aggregated).forEach(v => total += v);
        
        const colors = ['#3b82f6', '#60a5fa', '#22c55e', '#f97316', '#a855f7'];
        
        this.specialties = Object.entries(aggregated).map(([name, count], i) => ({
          name: name,
          count: count,
          percentage: total > 0 ? (count / total * 100) : 0,
          color: colors[i % colors.length]
        })).sort((a, b) => b.count - a.count);
      },
      error: (err) => console.error('Error fetching faculty stats', err)
    });
  }
}
