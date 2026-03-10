import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Ajouté pour le support du CSS dynamique
import { RouterOutlet } from '@angular/router';
import { DashboardSidebarComponent } from './components/dashboard-sidebar/dashboard-sidebar.component';
import { SidebarService } from '../../core/services/sidebar.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DashboardSidebarComponent],
  template: `
    <div class="dashboard-container">
      <app-dashboard-sidebar></app-dashboard-sidebar>
      <main class="dashboard-main" [class.sidebar-collapsed]="sidebarService.isCollapsed">
          <div class="dashboard-content">
              <router-outlet></router-outlet>
          </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f8fafc;
      display: flex;
    }
    .dashboard-main {
      flex: 1;
      width: 100%;
      padding-left: 260px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .dashboard-main.sidebar-collapsed {
      padding-left: 88px;
    }
    .dashboard-content {
      padding: 2.5rem;
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
    }
    @media (max-width: 1024px) {
      .dashboard-main, .dashboard-main.sidebar-collapsed {
        padding-left: 0;
      }
    }
  `]
})
export class DashboardLayoutComponent {
  sidebarService = inject(SidebarService);
}