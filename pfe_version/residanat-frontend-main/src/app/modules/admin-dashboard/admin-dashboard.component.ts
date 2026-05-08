import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { ChartCardComponent } from './components/chart-card/chart-card.component';
import { DossierStatusChartComponent } from './components/dossier-status-chart/dossier-status-chart.component';
import { ResultHistogramComponent } from './components/result-histogram/result-histogram.component';
import { DnaCaduceusVisualComponent } from './components/dna-caduceus-visual/dna-caduceus-visual.component';
import { TunisiaMapChartComponent } from './components/tunisia-map-chart/tunisia-map-chart.component';
import { ClaimsDoughnutComponent } from './components/claims-doughnut/claims-doughnut.component';
import { TopSpecialtiesComponent } from './components/top-specialties/top-specialties.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConcoursService, Concours } from '../../core/services/concours.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    KpiCardComponent, 
    ChartCardComponent, 
    DossierStatusChartComponent,
    ResultHistogramComponent,
    DnaCaduceusVisualComponent,
    TunisiaMapChartComponent,
    ClaimsDoughnutComponent,
    TopSpecialtiesComponent,
    TranslateModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  kpis = [
    { title: '', key: 'ADMIN_DASHBOARD.KPIS.TOTAL_CANDIDATES', value: '...', icon: 'globe', color: 'cyan' },
    { title: '', key: 'ADMIN_DASHBOARD.KPIS.VALIDATED_DOSSIERS', value: '...', icon: 'check', color: 'green' },
    { title: '', key: 'ADMIN_DASHBOARD.KPIS.GENERATED_CONVOCATIONS', value: '...', icon: 'id-card', color: 'navy' },
    { title: '', key: 'ADMIN_DASHBOARD.KPIS.ACTIVE_CLAIMS', value: '...', icon: 'speech', color: 'orange' }
  ];

  // --- Concours Selection ---
  concoursList: Concours[] = [];
  selectedConcoursId: string = '';
  isConcoursDropdownOpen = false;

  private translate = inject(TranslateService);
  private concoursService = inject(ConcoursService);
  private langChangeSub?: Subscription;

  private baseHost = (window.location.port === '4200' || window.location.hostname === 'localhost') 
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.initKpiLabels();
    this.loadConcours();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.initKpiLabels();
    });
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
  }

  initKpiLabels() {
    this.kpis.forEach(kpi => {
      kpi.title = this.translate.instant(kpi.key);
    });
  }

  loadConcours() {
    this.concoursService.getConcours(0, 100).subscribe({
      next: (res) => {
        this.concoursList = res.content;
        // Auto-select the most recent concours
        if (this.concoursList.length > 0) {
          this.selectedConcoursId = this.concoursList[0].id!;
          this.concoursService.setSelectedConcoursId(this.selectedConcoursId);
        }
        this.fetchRealStats();
      },
      error: () => this.fetchRealStats()
    });
  }

  selectConcours(id: string) {
    this.selectedConcoursId = id;
    this.concoursService.setSelectedConcoursId(id); // Global sync
    this.isConcoursDropdownOpen = false;
    this.fetchRealStats();
  }

  getSelectedConcoursLabel(): string {
    if (!this.selectedConcoursId) return this.translate.instant('ADMIN_DASHBOARD.ALL_CONCOURS');
    const c = this.concoursList.find(c => c.id === this.selectedConcoursId);
    return c ? (c.libelle || c.titre || this.selectedConcoursId) : this.selectedConcoursId;
  }

  toggleConcoursDropdown() {
    this.isConcoursDropdownOpen = !this.isConcoursDropdownOpen;
  }

  fetchRealStats() {
    const cid = this.selectedConcoursId;
    const params = cid ? `?concoursId=${cid}` : '';

    // 1. Total Candidats (Filtered by concours via dossiers)
    this.http.get<any>(`${this.baseHost}/api/dossiers/stats/counts-by-status${params}`).subscribe({
      next: (stats) => this.kpis[0].value = (stats['total'] || 0).toString(),
      error: () => this.kpis[0].value = '—'
    });

    // 2. Dossiers Validés (filtered by concours)
    this.http.get<any>(`${this.baseHost}/api/dossiers/stats/counts-by-status${params}`).subscribe({
      next: (stats) => this.kpis[1].value = (stats['valide'] || 0).toString(),
      error: () => this.kpis[1].value = '—'
    });

    // 3. Convocations Générées (filtered by concours)
    this.http.get<number>(`${this.baseHost}/api/convocations/stats/generated-count${params}`).subscribe({
      next: (count) => this.kpis[2].value = count.toString(),
      error: () => this.kpis[2].value = '—'
    });

    // 4. Réclamations Actives (filtered by concours)
    this.http.get<any>(`${this.baseHost}/api/admin/reclamations/stats/counts-by-status${params}`).subscribe({
      next: (stats) => {
        const actives = (stats['soumise'] || 0) + (stats['en_cours'] || 0);
        this.kpis[3].value = actives.toString();
      },
      error: () => this.kpis[3].value = '—'
    });
  }
}
