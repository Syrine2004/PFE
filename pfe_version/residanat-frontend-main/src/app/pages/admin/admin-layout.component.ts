import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminSidebarComponent],
  template: `
    <div class="admin-layout">
      <app-admin-sidebar></app-admin-sidebar>
      
      <main class="admin-main" [class.collapsed]="sidebarService.isCollapsed">
        <div class="admin-container">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: #f8fafc;
    }
    .admin-main {
      flex: 1;
      padding-left: 260px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .admin-main.collapsed {
      padding-left: 88px;
    }
    .admin-container {
      padding: 2rem;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
    }
    @media (max-width: 1024px) {
      .admin-main, .admin-main.collapsed {
        padding-left: 0;
      }
    }
  `]
})
export class AdminLayoutComponent {
  sidebarService = inject(SidebarService);
}