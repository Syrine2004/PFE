import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminSidebarComponent],
  template: `
    <div class="admin-layout">
      <app-admin-sidebar></app-admin-sidebar>
      
      <main class="admin-main">
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
      transition: all 0.3s ease;
    }
    .admin-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    @media (max-width: 1024px) {
      .admin-main {
        padding-left: 0;
      }
    }
  `]
})
export class AdminLayoutComponent { }