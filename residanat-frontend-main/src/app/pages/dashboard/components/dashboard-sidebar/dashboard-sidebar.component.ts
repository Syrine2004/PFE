import { Component, Input, Output, EventEmitter, inject } from '@angular/core'; // Ajout de inject
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service'; // Ajuste le chemin vers ton service

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.scss'
})
export class DashboardSidebarComponent {
  // 1. Injection du service d'authentification
  private authService = inject(AuthService);

  @Input() collapsed = false;
  @Output() toggle = new EventEmitter<boolean>();
  mobileOpen = false;

  userRole: string = '';
  ngOnInit() {
    this.userRole = localStorage.getItem('role') || '';
  }

  getCandidatId() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  navItems: NavItem[] = [
    { href: '/dashboard', label: 'Tableau de bord', icon: 'layout-dashboard' },
    { href: '/dashboard/creer-dossier', label: 'Inscription au concours', icon: 'file-plus' },
    { href: '/dashboard/dossier', label: 'Mon dossier', icon: 'folder-open' },
    { href: '/dashboard/specialites', label: 'Spécialités', icon: 'stethoscope' },
    { href: '/dashboard/centre-3d', label: 'Visualisation 3D', icon: 'map-pin' },
    { href: '/dashboard/convocation', label: 'Convocation', icon: 'file-text' },
    { href: '/dashboard/resultat', label: 'Resultats', icon: 'bar-chart-3' },
    { href: '/dashboard/reclamation', label: 'Reclamation', icon: 'message-circle' },
    { href: '/dashboard/parametres', label: 'Parametres', icon: 'settings' },
  ];

  toggleSidebar() {
    this.toggle.emit(!this.collapsed);
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMobile() {
    this.mobileOpen = false;
  }

  onMockClick(event: Event, label: string) {
    event.preventDefault();
    console.log(`Mock click for ${label}`);
  }

  // 2. Méthode de déconnexion sécurisée pour le candidat
  onLogout() {
    if (confirm("Voulez-vous vraiment vous déconnecter de votre espace candidat ?")) {
      this.authService.logout();
    }
  }
}