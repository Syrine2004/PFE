import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Ajouté pour le support du CSS dynamique
import { RouterOutlet } from '@angular/router';
import { DashboardSidebarComponent } from './components/dashboard-sidebar/dashboard-sidebar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DashboardSidebarComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {
  isSidebarCollapsed = false;

  onToggleSidebar(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }
}